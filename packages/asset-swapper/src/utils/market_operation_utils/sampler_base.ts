import { BigNumber } from '@0x/utils';
import { MethodAbi } from 'ethereum-types';
import { FastABI } from 'fast-abi';

import { ERC20BridgeSamplerContract } from '../../wrappers';
import { artifacts } from '../../artifacts';
import { DUMMY_PROVIDER } from '../../constants';

import { Chain } from '../chain';

import { ContractHelper } from '../../sources/utils';

const SAMPLER_CONTRACT_ADDRESS = '0x5555555555555555555555555555555555555555'

/**
 * Encapsulates interactions with the `ERC20BridgeSampler` contract.
 */
export class DexOrderSamplerBase {
    protected readonly _samplerContract: ERC20BridgeSamplerContract;
    protected readonly _samplerContractBytecode: string;
    protected readonly _contractHelper: ContractHelper<ERC20BridgeSamplerContract>;

    protected constructor(public readonly chain: Chain) {
        const fastAbi = new FastABI(
            ERC20BridgeSamplerContract.ABI() as MethodAbi[],
            { BigNumber },
        );
        this._samplerContract = new ERC20BridgeSamplerContract(
            SAMPLER_CONTRACT_ADDRESS,
            DUMMY_PROVIDER,
            {},
            {},
            undefined,
            {
                encodeInput: (fnName: string, values: any) => fastAbi.encodeInput(fnName, values),
                decodeOutput: (fnName: string, data: string) => fastAbi.decodeOutput(fnName, data),
            },
        );
        this._samplerContractBytecode = artifacts.ERC20BridgeSampler.compilerOutput.evm.bytecode.object;
        this._contractHelper = new ContractHelper(chain, this._samplerContract);
    }
}
