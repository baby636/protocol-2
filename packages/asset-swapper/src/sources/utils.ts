import { ContractVersionData } from 'ethereum-types';
import { BaseContract, ContractFunctionObj } from '@0x/base-contract';
import { hexUtils } from '@0x/utils';

import { Address, Bytes } from '../types';
import { Chain, ChainEthCallOpts } from '../utils/chain';

const ADDRESS_SIZE = 20;

export function getDeterministicContractAddressFromBytecode(bytecode: Bytes): Address {
    return hexUtils.leftPad(hexUtils.hash(bytecode), ADDRESS_SIZE);
}

export function getBytecodeFromArtifact(artifact: ContractVersionData): Bytes {
    return artifact.compilerOutput.evm.deployedBytecode.object;
}

export function getDeterministicContractAddressFromArtifact(artifact: ContractVersionData): Address {
    return getDeterministicContractAddressFromBytecode(getBytecodeFromArtifact(artifact));
}

export interface GeneratedContract extends BaseContract {
    getABIDecodedReturnData: <T>(methodName: string, returnData: string) => T;
}

type ContractFunction<TArgs extends any[], TReturn> = (...args: TArgs) => ContractFunctionObj<TReturn>;

export class ContractHelper<TBaseContract extends GeneratedContract> {
    constructor(public readonly chain: Chain, public readonly contract: TBaseContract) {
    }

    async ethCallAsync<TArgs extends any[], TReturn>(
        fn: ContractFunction<TArgs, TReturn>,
        args: TArgs,
        callOpts: Partial<ChainEthCallOpts> = {},
    ): Promise<TReturn> {
        const resultData = await this.chain.ethCall({
            to: this.contract.address,
            data: fn.apply(this.contract, args).getABIEncodedTransactionData(),
            ...callOpts,
        });
        try {
            return this.contract.getABIDecodedReturnData<TReturn>(fn.name, resultData);
        } catch (err) {
            throw new Error(`eth_call to ${fn.name}() returned unexpected bytes: ${resultData}`);
        }
    }
}
