import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { Address } from '../../types';
import { Chain } from '../../utils/chain';
import { valueByChainId } from '../../utils/utils';
import { ERC20BridgeSamplerContract } from '../../wrappers';

import { NULL_ADDRESS } from '../constants';
import { SourceSamplerBase } from '../source_sampler';
import { DexSample, ERC20BridgeSource, FillData } from "../types";

import { UniswapV2FillData } from "./uniswap_v2";

export interface KyberDmmFillData extends UniswapV2FillData {
    poolsPath: Address[];
}

const KYBER_DMM_ROUTER_BY_CHAIN_ID = valueByChainId<Address>(
    {
        [ChainId.Mainnet]: '0x1c87257f5e8609940bc751a07bb085bb7f8cdbe6',
    },
    NULL_ADDRESS,
);

export class KyberDmmSampler extends
    SourceSamplerBase<ERC20BridgeSamplerContract, ERC20BridgeSamplerContract>
{
    public static async createAsync(chain: Chain): Promise<KyberDmmSampler> {
        return new KyberDmmSampler(chain, KYBER_DMM_ROUTER_BY_CHAIN_ID[chain.chainId]);
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

    public async getSellQuotesAsync(
        tokenAddressPath: Address[],
        takerFillAmounts: BigNumber[],
    ): Promise<DexSample<KyberDmmFillData>[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const [pools, samples] = await this._sellContractHelper.ethCallAsync(
            this._sellContract.sampleSellsFromKyberDmm,
            [
                this._router,
                tokenAddressPath,
                takerFillAmounts,
            ],
        );
        return takerFillAmounts.map((a, i) => {
            return {
                source: ERC20BridgeSource.KyberDmm,
                fillData: {
                    router: this._router,
                    poolsPath: pools,
                    tokenAddressPath: tokenAddressPath,
                },
                input: a,
                output: samples[i],
            };
        });
    }

    public async getBuyQuotesAsync(
        tokenAddressPath: Address[],
        makerFillAmounts: BigNumber[],
    ): Promise<DexSample<KyberDmmFillData>[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const [pools, samples] = await this._buyContractHelper.ethCallAsync(
            this._buyContract.sampleBuysFromKyberDmm,
            [
                this._router,
                tokenAddressPath,
                makerFillAmounts,
            ],
        );
        return makerFillAmounts.map((a, i) => {
            return {
                source: ERC20BridgeSource.KyberDmm,
                fillData: {
                    router: this._router,
                    poolsPath: pools,
                    tokenAddressPath: tokenAddressPath,
                },
                input: a,
                output: samples[i],
            };
        });
    }
}

export const KYBER_DMM_GAS_SCHEDULE = (fillData?: FillData) => {
    // TODO: Different base cost if to/from ETH.
    let gas = 95e3;
    const path = (fillData as KyberDmmFillData).tokenAddressPath;
    if (path.length > 2) {
        gas += (path.length - 2) * 65e3; // +65k for each hop.
    }
    return gas;
};
