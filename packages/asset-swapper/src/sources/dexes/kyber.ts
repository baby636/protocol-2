import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { Address } from '../../types';
import { Chain } from '../../utils/chain';
import { valueByChainId } from '../../utils/utils';
import { ERC20BridgeSamplerContract } from '../../wrappers';

import { NULL_ADDRESS, NULL_BYTES } from '../constants';
import { SourceSamplerBase } from '../source_sampler';
import { MAINNET_TOKENS, ROPSTEN_TOKENS } from '../tokens';
import { DexSample, ERC20BridgeSource, FillData } from "../types";

interface KyberSamplerOpts {
    networkProxy: Address;
    hintHandler: Address;
    weth: Address;
}

export interface KyberFillData extends FillData {
    hint: string;
    reserveId: string;
    networkProxy: Address;
}

const MAX_KYBER_RESERVES_QUERIED = 5;
const KYBER_RESERVE_OFFSETS = Array(MAX_KYBER_RESERVES_QUERIED)
        .fill(0).map((_v, i) => new BigNumber(i));
const KYBER_OPTS_BY_CHAIN_ID = valueByChainId<KyberSamplerOpts>(
    {
        [ChainId.Mainnet]: {
            networkProxy: '0x9aab3f75489902f3a48495025729a0af77d4b11e',
            hintHandler: '0xa1C0Fa73c39CFBcC11ec9Eb1Afc665aba9996E2C',
            weth: MAINNET_TOKENS.WETH,
        },
        [ChainId.Ropsten]: {
            networkProxy: '0x818e6fecd516ecc3849daf6845e3ec868087b755',
            hintHandler: '0x63f773c026093eef988e803bdd5772dd235a8e71',
            weth: ROPSTEN_TOKENS.WETH,
        },
    },
    {
        networkProxy: NULL_ADDRESS,
        hintHandler: NULL_ADDRESS,
        weth: NULL_ADDRESS,
    },
);

export class KyberSampler extends
    SourceSamplerBase<ERC20BridgeSamplerContract, ERC20BridgeSamplerContract>
{
    public static async createAsync(chain: Chain): Promise<KyberSampler> {
        return new KyberSampler(chain, KYBER_OPTS_BY_CHAIN_ID[chain.chainId]);
    }

    protected constructor(chain: Chain, private readonly _opts: KyberSamplerOpts) {
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
    ): Promise<DexSample<KyberFillData>[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const [takerToken, makerToken] = tokenAddressPath;
        const results = await Promise.all(KYBER_RESERVE_OFFSETS.map(reserveOffset =>
            this._sellContractHelper.ethCallAsync(
            this._sellContract.sampleSellsFromKyberNetwork,
            [
                {
                    ...this._opts,
                    reserveOffset,
                    hint: NULL_BYTES,
                },
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
        )));
        return results.map(([reserveId, hint, samples]) =>
            takerFillAmounts.map((a, i) => ({
                source: ERC20BridgeSource.Kyber,
                fillData: {
                    hint,
                    reserveId,
                    networkProxy: this._opts.networkProxy,
                },
                input: a,
                output: samples[i],
            })),
        ).flat(1);
    }

    public async getBuyQuotesAsync(
        tokenAddressPath: Address[],
        makerFillAmounts: BigNumber[],
    ): Promise<DexSample<KyberFillData>[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const [takerToken, makerToken] = tokenAddressPath;
        const results = await Promise.all(KYBER_RESERVE_OFFSETS.map(reserveOffset =>
            this._sellContractHelper.ethCallAsync(
            this._sellContract.sampleBuysFromKyberNetwork,
            [
                {
                    ...this._opts,
                    reserveOffset,
                    hint: NULL_BYTES,
                },
                takerToken,
                makerToken,
                makerFillAmounts,
            ],
        )));
        return results.map(([reserveId, hint, samples]) =>
            makerFillAmounts.map((a, i) => ({
                source: ERC20BridgeSource.Kyber,
                fillData: {
                    hint,
                    reserveId,
                    networkProxy: this._opts.networkProxy,
                },
                input: a,
                output: samples[i],
            })),
        ).flat(1);
    }
}

export const KYBER_GAS_SCHEDULE = () => 450e3;
