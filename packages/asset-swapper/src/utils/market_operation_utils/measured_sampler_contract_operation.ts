import { ContractFunctionObj } from '@0x/base-contract';
import { BigNumber, decodeBytesAsRevertError, logUtils } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { ERC20BridgeSource, FillData, MeasuredSamplerResult, MeasuredSourceQuoteOperation } from './types';

export type Parameters<T> = T extends (...args: infer TArgs) => any ? TArgs : never;

export interface MeasuredSamplerContractCall<
    TFunc extends (...args: any[]) => ContractFunctionObj<any>,
    TFillData extends FillData = FillData
> {
    contract: ERC20BridgeSamplerContract;
    function: TFunc;
    params: Parameters<TFunc>;
    callback?: (callResults: string, fillData: TFillData) => MeasuredSamplerResult;
}

export class MeasuredSamplerContractOperation<
    TFunc extends (...args: any[]) => ContractFunctionObj<any>,
    TFillData extends FillData = FillData
> implements MeasuredSourceQuoteOperation<TFillData> {
    public readonly source: ERC20BridgeSource;
    public fillData: TFillData;
    private readonly _samplerContract: ERC20BridgeSamplerContract;
    private readonly _samplerFunction: TFunc;
    private readonly _params: Parameters<TFunc>;
    private readonly _callback?: (callResults: string, fillData: TFillData) => MeasuredSamplerResult;

    constructor(
        opts: { source: ERC20BridgeSource; fillData?: TFillData } & MeasuredSamplerContractCall<TFunc, TFillData>,
    ) {
        this.source = opts.source;
        this.fillData = opts.fillData || ({} as TFillData); // tslint:disable-line:no-object-literal-type-assertion
        this._samplerContract = opts.contract;
        this._samplerFunction = opts.function;
        this._params = opts.params;
        this._callback = opts.callback;
    }

    public encodeCall(): string {
        return this._samplerFunction
            .bind(this._samplerContract)(...this._params)
            .getABIEncodedTransactionData();
    }
    public handleCallResults(callResults: string): MeasuredSamplerResult {
        if (this._callback !== undefined) {
            return this._callback(callResults, this.fillData);
        } else {
            const [gasUsed, samples] = this._samplerContract.getABIDecodedReturnData<[BigNumber[], BigNumber[]]>(
                this._samplerFunction.name,
                callResults,
            );
            return { gasUsed, samples };
        }
    }
    public handleRevert(callResults: string): MeasuredSamplerResult {
        let msg = callResults;
        try {
            msg = decodeBytesAsRevertError(callResults).toString();
        } catch (e) {
            // do nothing
        }
        logUtils.warn(
            `SamplerContractOperation: ${this.source}.${this._samplerFunction.name} reverted ${msg} ${JSON.stringify(
                this.fillData,
                null,
                2,
            )}`,
        );
        return { gasUsed: [], samples: [] };
    }
}
