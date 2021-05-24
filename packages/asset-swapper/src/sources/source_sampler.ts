import { BigNumber } from '@0x/utils';
import { ContractVersionData , SupportedProvider } from 'ethereum-types';

import { artifacts } from '../artifacts';
import { DUMMY_PROVIDER } from '../constants';
import { Chain } from '../utils/chain';
import { Address, Bytes } from '../types';

import { DexSample} from './types';

import { ContractHelper, GeneratedContract, getBytecodeFromArtifact, getDeterministicContractAddressFromArtifact } from './utils';

interface ContractWrapperType<T> {
    new (address: Address, provider: SupportedProvider): T;
}

interface ArtifactsMap {
    [artifactName: string]: ContractVersionData;
}

export interface SourceSampler {
    canConvertTokens(tokenAddressPath: Address[]): boolean;

    getSellQuotesAsync(
        tokenAddressPath: Address[],
        takerFillAmounts: BigNumber[],
    ): Promise<DexSample[]>;

    getBuyQuotesAsync(
        tokenAddressPath: Address[],
        makerFillAmounts: BigNumber[],
    ): Promise<DexSample[]>;
}

interface SourceSamplerBaseOptions<
    TSellSamplerContract extends GeneratedContract,
    TBuySamplerContract extends GeneratedContract,
> {
    chain: Chain,
    sellSamplerContractArtifactName: string;
    buySamplerContractArtifactName: string;
    sellSamplerContractType: ContractWrapperType<TSellSamplerContract>,
    buySamplerContractType: ContractWrapperType<TBuySamplerContract>,
}

export abstract class SourceSamplerBase<
    TSellSamplerContract extends GeneratedContract,
    TBuySamplerContract extends GeneratedContract,
> implements SourceSampler {
    protected readonly _chain: Chain;
    protected readonly _sellContract: TSellSamplerContract;
    protected readonly _buyContract: TBuySamplerContract;
    protected readonly _sellContractHelper: ContractHelper<TSellSamplerContract>;
    protected readonly _buyContractHelper: ContractHelper<TBuySamplerContract>;
    protected readonly _sellContractBytecode: Bytes;
    protected readonly _buyContractBytecode: Bytes;

    protected constructor(opts: SourceSamplerBaseOptions<TSellSamplerContract, TBuySamplerContract>) {
        this._chain = opts.chain;
        const sellContractArtifact = (artifacts as ArtifactsMap)[`${opts.sellSamplerContractArtifactName}SellSampler`];
        const buyContractArtifact = (artifacts as ArtifactsMap)[`${opts.buySamplerContractArtifactName}BuySampler`];
        this._sellContractBytecode = getBytecodeFromArtifact(sellContractArtifact)
        this._buyContractBytecode = getBytecodeFromArtifact(buyContractArtifact)
        this._sellContract = new opts.sellSamplerContractType(
            getDeterministicContractAddressFromArtifact(sellContractArtifact),
            DUMMY_PROVIDER,
        );
        this._buyContract = new opts.buySamplerContractType(
            getDeterministicContractAddressFromArtifact(buyContractArtifact),
            DUMMY_PROVIDER,
        );
        this._sellContractHelper = new ContractHelper(
            opts.chain,
            this._sellContract,
        );
        this._buyContractHelper = new ContractHelper(
            opts.chain,
            this._buyContract,
        );
    }

    public canConvertTokens(_tokenAddressPath: Address[]): boolean {
        return true;
    }

    public abstract getSellQuotesAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<DexSample[]>;

    public abstract getBuyQuotesAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<DexSample[]>;
}
