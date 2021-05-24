import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { Address } from '../../types';
import { Chain } from '../../utils/chain';
import { valueByChainId } from '../../utils/utils';
import { ERC20BridgeSamplerContract } from '../../wrappers';

import { SourceSamplerBase } from '../source_sampler';
import { DexSample, ERC20BridgeSource, FillData } from "../types";

import { MAINNET_TOKENS } from '../tokens';

export interface LiquidityProviderFillData extends FillData {
    poolAddress: Address;
    gasCost: number;
}

export interface LiquidityProviderInfo {
    tokens: Address[];
    gasCost: number | ((takerToken: Address, makerToken: Address) => number);
}

export interface LiquidityProviderRegistry {
    [address: string]: LiquidityProviderInfo;
}

export const DEFAULT_LIQUIDITY_PROVIDER_REGISTRY_BY_CHAIN_ID = valueByChainId<LiquidityProviderRegistry>(
    {
        [ChainId.Mainnet]: {
            // OBQ
            ['0x1d0d407c5af8c86f0a6494de86e56ae21e46a951']: {
                tokens: [
                    MAINNET_TOKENS.WETH,
                    MAINNET_TOKENS.USDC,
                    MAINNET_TOKENS.USDT,
                    MAINNET_TOKENS.WBTC,
                    MAINNET_TOKENS.PAX,
                    MAINNET_TOKENS.LINK,
                    MAINNET_TOKENS.KNC,
                    MAINNET_TOKENS.MANA,
                    MAINNET_TOKENS.DAI,
                    MAINNET_TOKENS.BUSD,
                    MAINNET_TOKENS.AAVE,
                    MAINNET_TOKENS.HT,
                ],
                gasCost: (takerToken: string, makerToken: string) =>
                    [takerToken, makerToken].includes(MAINNET_TOKENS.WETH) ? 160e3 : 280e3,
            },
        },
    },
    {},
);

export type LiquidityProviderRegistryByChainId = typeof DEFAULT_LIQUIDITY_PROVIDER_REGISTRY_BY_CHAIN_ID;

export function mergeLiquidityProviderRegistries(...registries: LiquidityProviderRegistryByChainId[]): LiquidityProviderRegistryByChainId {
    return {
        ...Object.values(ChainId).map(c => ({
            [c]: {
                ...registries.map(r => r[c as ChainId]),
            },
        })),
    } as any;
}

export class LiquidityProviderSampler extends
    SourceSamplerBase<ERC20BridgeSamplerContract, ERC20BridgeSamplerContract>
{
    public static async createAsync(
        chain: Chain,
        providerAddress: Address,
        registry: LiquidityProviderRegistryByChainId = DEFAULT_LIQUIDITY_PROVIDER_REGISTRY_BY_CHAIN_ID,
    ): Promise<LiquidityProviderSampler> {
        const providerInfo = registry[chain.chainId][providerAddress];
        if (!providerInfo) {
            throw new Error(`Liquidity provider ${providerAddress} does not exist on chain ${chain.chainId}`);
        }
        return new LiquidityProviderSampler(chain, providerAddress, providerInfo);
    }

    protected constructor(
        chain: Chain,
        private readonly _providerAddress: Address,
        private readonly _providerInfo: LiquidityProviderInfo,
    ) {
        super({
            chain,
            sellSamplerContractArtifactName: 'ERC20BridgeSampler',
            buySamplerContractArtifactName: 'ERC20BridgeSampler',
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
        });
    }

    public canConvertTokens(tokenAddressPath: Address[]): boolean {
        if (tokenAddressPath.length !== 2) {
            return false;
        }
        return tokenAddressPath.every(t => this._providerInfo.tokens.includes(t));
    }

    public async getSellQuotesAsync(
        tokenAddressPath: Address[],
        takerFillAmounts: BigNumber[],
    ): Promise<DexSample<LiquidityProviderFillData>[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const [takerToken, makerToken] = tokenAddressPath;
        const samples = await this._sellContractHelper.ethCallAsync(
            this._sellContract.sampleSellsFromLiquidityProvider,
            [
                this._providerAddress,
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
        );
        return takerFillAmounts.map((a, i) => {
            return {
                source: ERC20BridgeSource.LiquidityProvider,
                fillData: {
                    poolAddress: this._providerAddress,
                    gasCost: this._getGasCost(takerToken, makerToken),
                },
                input: a,
                output: samples[i],
            };
        });
    }

    public async getBuyQuotesAsync(
        tokenAddressPath: Address[],
        makerFillAmounts: BigNumber[],
    ): Promise<DexSample<LiquidityProviderFillData>[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const [takerToken, makerToken] = tokenAddressPath;
        const samples = await this._sellContractHelper.ethCallAsync(
            this._sellContract.sampleBuysFromLiquidityProvider,
            [
                this._providerAddress,
                takerToken,
                makerToken,
                makerFillAmounts,
            ],
        );
        return makerFillAmounts.map((a, i) => {
            return {
                source: ERC20BridgeSource.LiquidityProvider,
                fillData: {
                    poolAddress: this._providerAddress,
                    gasCost: this._getGasCost(takerToken, makerToken),
                },
                input: a,
                output: samples[i],
            };
        });
    }

    private _getGasCost(takerToken: Address, makerToken: Address): number {
        return typeof(this._providerInfo.gasCost) === 'number'
            ? this._providerInfo.gasCost
            : this._providerInfo.gasCost(takerToken, makerToken);
    }
}

export const LIQUIDITY_RPOVIDER_GAS_SCHEDULE = (fillData?: FillData) => {
    return (fillData as LiquidityProviderFillData).gasCost || 100e3;
}
