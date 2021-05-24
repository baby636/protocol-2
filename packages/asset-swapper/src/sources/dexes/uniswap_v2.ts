import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { Address } from '../../types';
import { Chain } from '../../utils/chain';
import { ERC20BridgeSamplerContract } from '../../wrappers';

import { SourceSamplerBase } from '../source_sampler';
import { DexSample, ERC20BridgeSource, FillData } from "../types";

const UNISWAP_V2_ROUTER_BY_CHAIN_ID_BY_FORK = {
    [ChainId.Mainnet]: {
        [ERC20BridgeSource.UniswapV2]: '0xf164fc0ec4e93095b804a4795bbe1e041497b92a',
        [ERC20BridgeSource.SushiSwap]: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
        [ERC20BridgeSource.CryptoCom]: '0xceb90e4c17d626be0facd78b79c9c87d7ca181b3',
        [ERC20BridgeSource.Linkswap]: '0xa7ece0911fe8c60bff9e99f8fafcdbe56e07aff1',
    },
    [ChainId.Ropsten]: {
        [ERC20BridgeSource.UniswapV2]: '0xf164fc0ec4e93095b804a4795bbe1e041497b92a',
        [ERC20BridgeSource.SushiSwap]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
    },
    [ChainId.BSC]: {
        [ERC20BridgeSource.SushiSwap]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ERC20BridgeSource.PancakeSwap]: '0x05ff2b0db69458a0750badebc4f9e13add608c7f',
        [ERC20BridgeSource.PancakeSwapV2]: '0x10ed43c718714eb63d5aa57b78b54704e256024e',
        [ERC20BridgeSource.BakerySwap]: '0xcde540d7eafe93ac5fe6233bee57e1270d3e330f',
        [ERC20BridgeSource.ApeSwap]: '0xc0788a3ad43d79aa53b09c2eacc313a787d1d607',
        [ERC20BridgeSource.CafeSwap]: '0x933daea3a5995fb94b14a7696a5f3ffd7b1e385a',
        [ERC20BridgeSource.CheeseSwap]: '0x3047799262d8d2ef41ed2a222205968bc9b0d895',
        [ERC20BridgeSource.JulSwap]: '0xbd67d157502a23309db761c41965600c2ec788b2',
    },
    [ChainId.Polygon]: {
        [ERC20BridgeSource.Dfyn]: '0xa102072a4c07f06ec3b4900fdc4c7b80b6c57429',
        [ERC20BridgeSource.ComethSwap]: '0x93bcdc45f7e62f89a8e901dc4a0e2c6c427d9f25',
        [ERC20BridgeSource.QuickSwap]: '0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff',
    },
};

export interface UniswapV2FillData extends FillData {
    tokenAddressPath: string[];
    router: string;
}

export class UniswapV2Sampler extends
    SourceSamplerBase<ERC20BridgeSamplerContract, ERC20BridgeSamplerContract>
{
    private readonly _router: Address;

    public static async createAsync(chain: Chain, fork: ERC20BridgeSource): Promise<UniswapV2Sampler> {
        return new UniswapV2Sampler(chain, fork);
    }

    protected constructor(chain: Chain, fork: ERC20BridgeSource) {
        super({
            chain,
            sellSamplerContractArtifactName: 'ERC20BridgeSampler',
            buySamplerContractArtifactName: 'ERC20BridgeSampler',
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
        });
        this._router = (UNISWAP_V2_ROUTER_BY_CHAIN_ID_BY_FORK as any)[chain.chainId]?.[fork]! as Address;
    }

    public async getSellQuotesAsync(
        tokenAddressPath: Address[],
        takerFillAmounts: BigNumber[],
    ): Promise<DexSample<UniswapV2FillData>[]> {
        const samples = await this._sellContractHelper.ethCallAsync(
            this._sellContract.sampleSellsFromUniswapV2,
            [
                this._router,
                tokenAddressPath,
                takerFillAmounts,
            ],
        );
        return takerFillAmounts.map((a, i) => {
            return {
                source: ERC20BridgeSource.UniswapV2,
                fillData: {
                    router: this._router,
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
    ): Promise<DexSample<UniswapV2FillData>[]> {
        const samples = await this._buyContractHelper.ethCallAsync(
            this._buyContract.sampleBuysFromUniswapV2,
            [
                this._router,
                tokenAddressPath,
                makerFillAmounts,
            ],
        );
        return makerFillAmounts.map((a, i) => {
            return {
                source: ERC20BridgeSource.UniswapV2,
                fillData: {
                    router: this._router,
                    tokenAddressPath: tokenAddressPath,
                },
                input: a,
                output: samples[i],
            };
        });
    }
}

export function UNISWAP_V2_GAS_SCHEDULE(fillData: FillData): number {
    // TODO: Different base cost if to/from ETH.
    let gas = 90e3;
    const path = (fillData as UniswapV2FillData).tokenAddressPath;
    if (path.length > 2) {
        gas += (path.length - 2) * 60e3; // +60k for each hop.
    }
    return gas;
}
