import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { Address } from '../../types';
import { Chain } from '../../utils/chain';
import { valueByChainId } from '../../utils/utils';
import { ERC20BridgeSamplerContract } from '../../wrappers';

import { NULL_ADDRESS } from '../constants';
import { SourceSamplerBase } from '../source_sampler';
import { DexSample, ERC20BridgeSource, FillData } from "../types";

const OASIS_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x5e3e0548935a83ad29fb2a9153d331dc6d49020f',
    },
    NULL_ADDRESS,
);

export interface OasisFillData extends FillData {
    router: Address;
}

export class OasisSampler extends
    SourceSamplerBase<ERC20BridgeSamplerContract, ERC20BridgeSamplerContract>
{
    public static async createAsync(chain: Chain): Promise<OasisSampler> {
        return new OasisSampler(
            chain,
            OASIS_ROUTER_BY_CHAIN_ID[chain.chainId],
        );
    }

    protected constructor(chain: Chain, private readonly _router: Address) {
        super({
            chain,
            sellSamplerContractArtifactName: 'ERC20BridgeSampler',
            buySamplerContractArtifactName: 'ERC20BridgeSampler',
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
        });
    }

    public canConvertTokens(tokenAddressPath: Address[]): boolean {
        return tokenAddressPath.length === 2;
    }

    public async getSellQuotesAsync(
        tokenAddressPath: Address[],
        takerFillAmounts: BigNumber[],
    ): Promise<DexSample<OasisFillData>[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const [takerToken, makerToken] = tokenAddressPath;
        const samples = await this._sellContractHelper.ethCallAsync(
            this._sellContract.sampleSellsFromEth2Dai,
            [
                this._router,
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
        );
        return takerFillAmounts.map((a, i) => {
            return {
                source: ERC20BridgeSource.Eth2Dai,
                fillData: { router: this._router },
                input: a,
                output: samples[i],
            };
        });
    }

    public async getBuyQuotesAsync(
        tokenAddressPath: Address[],
        makerFillAmounts: BigNumber[],
    ): Promise<DexSample<OasisFillData>[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const [takerToken, makerToken] = tokenAddressPath;
        const samples = await this._buyContractHelper.ethCallAsync(
            this._buyContract.sampleBuysFromEth2Dai,
            [
                this._router,
                takerToken,
                makerToken,
                makerFillAmounts,
            ],
        );
        return makerFillAmounts.map((a, i) => {
            return {
                source: ERC20BridgeSource.Eth2Dai,
                fillData: { router: this._router },
                input: a,
                output: samples[i],
            };
        });
    }
}

export const OASIS_GAS_SCHEDULE = () => 400e3;
