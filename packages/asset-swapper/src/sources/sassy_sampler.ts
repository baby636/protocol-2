import { BigNumber } from '@0x/utils';

import { constants } from '../constants';
import { Address } from  '../types';
import { Chain } from '../utils/chain';
import { getIntermediateTokens } from '../utils/market_operation_utils/multihop_utils';
import { TokenAdjacencyGraph } from '../utils/market_operation_utils/types';

import { UniswapV2Sampler, UniswapV3Sampler } from './dexes';
import { SourceFilters } from './source_filters';
import { SourceSampler } from './source_sampler';
import { DexSample, ERC20BridgeSource } from  './types';

const { ZERO_AMOUNT } = constants;

interface SassySamplerCreateOpts {
    chain: Chain;
    sources?: SourceFilters;
    tokenAdjacencyGraph?: TokenAdjacencyGraph;
}

interface SassySamplerCreateFullOpts {
    chain: Chain;
    sources: SourceFilters;
    tokenAdjacencyGraph: TokenAdjacencyGraph;
}

export interface SourceSamplerMap {
    [s: string]: SourceSampler;
}

export class SassySampler {

    public static async createAsync(opts: SassySamplerCreateOpts): Promise<SassySampler> {
        const _opts = {
            sources: SourceFilters.all(),
            tokenAdjacencyGraph: { default: [] },
            ...opts,
        };
        const samplers = Object.assign(
            {},
            ...await Promise.all(_opts.sources.getAllowed().map(async s => createSourceSamplerAsync(s, _opts))),
        );
        return new SassySampler(samplers, _opts.tokenAdjacencyGraph);
    }

    protected constructor(
        private readonly _samplers: SourceSamplerMap,
        private readonly _tokenAdjacencyGraph: TokenAdjacencyGraph,
    ) {}

    private _getSampler(source: ERC20BridgeSource): SourceSampler {
        const sampler = this._samplers[source];
        if (!sampler) {
            throw new Error(`No sampler registered for ${source}.`);
        }
        return sampler;
    }

    private async _sampleSellsFromSourceAsync(
        source: ERC20BridgeSource,
        tokenPath: Address[],
        takerAmounts: BigNumber[],
    ): Promise<DexSample[]> {
        return this._getSampler(source).getSellQuotesAsync(tokenPath, takerAmounts);
    }

    private async _sampleBuysFromSourceAsync(
        source: ERC20BridgeSource,
        tokenPath: Address[],
        takerAmounts: BigNumber[],
    ): Promise<DexSample[]> {
        return this._getSampler(source).getBuyQuotesAsync(tokenPath, takerAmounts);
    }

    public async getMedianSellRateAsync(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        takerAmount: BigNumber,
    ): Promise<BigNumber> {
        const ssamples = await Promise.all(
            sources.map(s => this._sampleSellsFromSourceAsync(s, [takerToken, makerToken], [takerAmount])));
        if (ssamples.length === 0) {
            return ZERO_AMOUNT;
        }
        const flatSortedSamples = ssamples
            .flat(1)
            .map(v => v.output)
            .sort((a, b) => a.comparedTo(b));
        if (flatSortedSamples.length === 0) {
            return ZERO_AMOUNT;
        }
        const medianSample = flatSortedSamples[Math.floor(flatSortedSamples.length / 2)];
        return medianSample.div(takerAmount);
    }

    public async getSellSamplesAsync(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        takerAmounts: BigNumber[],
    ): Promise<DexSample[][]> {
        const tokenPaths = this._getExpandedTokenPaths(makerToken, takerToken);
        return await Promise.all(
            sources.map(
                s => tokenPaths.map(p => this._sampleSellsFromSourceAsync(s, p, takerAmounts)),
            ).flat(),
        );
    }

    public async getBuySamplesAsync(
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        makerAmounts: BigNumber[],
    ): Promise<DexSample[][]> {
        const tokenPaths = this._getExpandedTokenPaths(makerToken, takerToken);
        return await Promise.all(
            sources.map(
                s => tokenPaths.map(p => this._sampleBuysFromSourceAsync(s, p, makerAmounts)),
            ).flat(),
        );
    }

    private _getExpandedTokenPaths(makerToken: string, takerToken: string): Address[][] {
        return [
            [takerToken, makerToken],
            ...this._getIntermediateTokens(makerToken, takerToken).map(t => [takerToken, t, makerToken]),
        ];
    }

    private _getIntermediateTokens(makerToken: string, takerToken: string): Address[] {
        return getIntermediateTokens(makerToken, takerToken, this._tokenAdjacencyGraph);
    }
}

async function createSourceSamplerAsync(source: ERC20BridgeSource, opts: SassySamplerCreateFullOpts): Promise<SourceSampler> {
    switch (source) {
        case ERC20BridgeSource.UniswapV2:
            return await UniswapV2Sampler.createAsync(opts.chain);
        case ERC20BridgeSource.UniswapV3:
            return await UniswapV3Sampler.createAsync(opts.chain);
    }
    throw new Error(`I don't know how to create sampler for source: ${source}`);
}
