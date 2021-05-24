import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { Address } from '../../types';
import { Chain } from '../../utils/chain';
import { valueByChainId } from '../../utils/utils';
import { ERC20BridgeSamplerContract } from '../../wrappers';

import { NULL_ADDRESS } from '../constants';
import { SourceSamplerBase } from '../source_sampler';
import { DexSample, ERC20BridgeSource, FillData } from "../types";

const UNISWAPV1_ROUTER_BY_CHAIN_ID = valueByChainId<Address>(
    {
        [ChainId.Mainnet]: '0xc0a47dfe034b400b47bdad5fecda2621de6c4d95',
        [ChainId.Ropsten]: '0x9c83dce8ca20e9aaf9d3efc003b2ea62abc08351',
    },
    NULL_ADDRESS,
);

const WRAPPED_NETWORK_TOKEN_BY_CHAIN_ID = valueByChainId<Address>(
    {
        [ChainId.Mainnet]: getContractAddressesForChainOrThrow(ChainId.Mainnet).etherToken,
        [ChainId.Ropsten]: getContractAddressesForChainOrThrow(ChainId.Ropsten).etherToken,
    },
    NULL_ADDRESS,
);

export interface UniswapV1FillData extends FillData {
    router: Address;
}

export class UniswapV1Sampler extends
    SourceSamplerBase<ERC20BridgeSamplerContract, ERC20BridgeSamplerContract>
{
    public static async createAsync(chain: Chain): Promise<UniswapV1Sampler> {
        return new UniswapV1Sampler(
            chain,
            UNISWAPV1_ROUTER_BY_CHAIN_ID[chain.chainId],
            WRAPPED_NETWORK_TOKEN_BY_CHAIN_ID[chain.chainId],
        );
    }

    protected constructor(chain: Chain, private readonly _router: Address, private readonly _weth: Address) {
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
    ): Promise<DexSample<UniswapV1FillData>[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const [takerToken, makerToken] = tokenAddressPath;
        const samples = await this._sellContractHelper.ethCallAsync(
            this._sellContract.sampleSellsFromUniswap,
            [
                this._router,
                this._normalizeToken(takerToken),
                this._normalizeToken(makerToken),
                takerFillAmounts,
            ],
        );
        return takerFillAmounts.map((a, i) => {
            return {
                source: ERC20BridgeSource.Uniswap,
                fillData: { router: this._router },
                input: a,
                output: samples[i],
            };
        });
    }

    public async getBuyQuotesAsync(
        tokenAddressPath: Address[],
        makerFillAmounts: BigNumber[],
    ): Promise<DexSample<UniswapV1FillData>[]> {
        if (!this.canConvertTokens(tokenAddressPath)) {
            return [];
        }
        const [takerToken, makerToken] = tokenAddressPath;
        const samples = await this._buyContractHelper.ethCallAsync(
            this._buyContract.sampleBuysFromUniswap,
            [
                this._router,
                this._normalizeToken(takerToken),
                this._normalizeToken(makerToken),
                makerFillAmounts,
            ],
        );
        return makerFillAmounts.map((a, i) => {
            return {
                source: ERC20BridgeSource.Uniswap,
                fillData: { router: this._router },
                input: a,
                output: samples[i],
            };
        });
    }

    private _normalizeToken(token: Address): Address {
        // Uniswap V1 only deals in ETH, not WETH, and we treat null as ETH in
        // the sampler.
        if (token.toLowerCase() === this._weth.toLowerCase()) {
            return NULL_ADDRESS;
        }
        return token;
    }
}

export const UNISWAP_GAS_SCHEDULE = () => 90e3;
