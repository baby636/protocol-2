import { NULL_BYTES } from '@0x/utils';

import { Chain } from '../chain';

import { BancorService } from './bancor_service';
import { PoolsCache } from './pools_cache';
import { SamplerOperations } from './sampler_operations';
import {
    BatchedOperation,
    LiquidityProviderRegistry,
    SourcesWithPoolsCache,
    TokenAdjacencyGraph,
} from './types';

type BatchedOperationResult<T> = T extends BatchedOperation<infer TResult> ? TResult : never;

export interface DexOrderSamplerOpts {
    chain: Chain;
    poolsCaches?: { [key in SourcesWithPoolsCache]: PoolsCache };
    tokenAdjacencyGraph?: TokenAdjacencyGraph;
    liquidityProviderRegistry?: LiquidityProviderRegistry,
    bancorServiceFn?: () => Promise<BancorService | undefined>;
}

/**
 * Encapsulates interactions with the `ERC20BridgeSampler` contract.
 */
export class DexOrderSampler extends SamplerOperations {
    constructor(opts: DexOrderSamplerOpts) {
        super({
            chain: opts.chain,
            poolsCaches: opts.poolsCaches,
            tokenAdjacencyGraph: opts.tokenAdjacencyGraph,
            liquidityProviderRegistry: opts.liquidityProviderRegistry,
            bancorServiceFn: opts.bancorServiceFn,
        });
    }

    /* Type overloads for `executeAsync()`. Could skip this if we would upgrade TS. */

    // prettier-ignore
    public async executeAsync<
        T1
    >(...ops: [T1]): Promise<[
        BatchedOperationResult<T1>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2
    >(...ops: [T1, T2]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3
    >(...ops: [T1, T2, T3]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4
    >(...ops: [T1, T2, T3, T4]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5
    >(...ops: [T1, T2, T3, T4, T5]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5, T6
    >(...ops: [T1, T2, T3, T4, T5, T6]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>,
        BatchedOperationResult<T6>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5, T6, T7
    >(...ops: [T1, T2, T3, T4, T5, T6, T7]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>,
        BatchedOperationResult<T6>,
        BatchedOperationResult<T7>
    ]>;

    // prettier-ignore
    public async executeAsync<
        T1, T2, T3, T4, T5, T6, T7, T8
    >(...ops: [T1, T2, T3, T4, T5, T6, T7, T8]): Promise<[
        BatchedOperationResult<T1>,
        BatchedOperationResult<T2>,
        BatchedOperationResult<T3>,
        BatchedOperationResult<T4>,
        BatchedOperationResult<T5>,
        BatchedOperationResult<T6>,
        BatchedOperationResult<T7>,
        BatchedOperationResult<T8>
    ]>;

    /**
     * Run a series of operations from `DexOrderSampler.ops` in a single transaction.
     */
    public async executeAsync(...ops: any[]): Promise<any[]> {
        return this.executeBatchAsync(ops);
    }

    /**
     * Run a series of operations from `DexOrderSampler.ops` in a single transaction.
     * Takes an arbitrary length array, but is not typesafe.
     */
    public async executeBatchAsync<T extends Array<BatchedOperation<any>>>(ops: T): Promise<any[]> {
        const callDatas = ops.map(o => o.encodeCall());

        // All operations are NOOPs
        if (callDatas.every(cd => cd === NULL_BYTES)) {
            return callDatas.map((_callData, i) => ops[i].handleCallResults(NULL_BYTES));
        }
        // Execute all non-empty calldatas.
        const rawCallResults = await this._contractHelper.ethCallAsync(
            this._samplerContract.batchCall,
            [callDatas.filter(cd => cd !== NULL_BYTES)],
            {
                gas: 100e6,
                overrides: {
                    [this._samplerContract.address]: {
                        code: this._samplerContractBytecode,
                    },
                },
            },
        );
        // Return the parsed results.
        let rawCallResultsIdx = 0;
        return callDatas.map((callData, i) => {
            // tslint:disable-next-line:boolean-naming
            const { data, success } =
                callData !== NULL_BYTES ? rawCallResults[rawCallResultsIdx++] : { success: true, data: NULL_BYTES };
            return success ? ops[i].handleCallResults(data) : ops[i].handleRevert(data);
        });
    }
}
