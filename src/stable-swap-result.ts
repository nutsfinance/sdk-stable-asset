import { FixedPointNumber, Token } from '@acala-network/sdk-core';
import BigNumber from "bignumber.js";

export interface StableSwapParameters {
  poolId: number;
  inputIndex: number;
  outputIndex: number;
  inputToken: Token;
  outputToken: Token;
  inputAmount: BigNumber;
}

export class StableSwapResult {
  public poolId: number;
  public inputIndex: number;
  public outputIndex: number;
  public inputToken: Token;
  public outputToken: Token;
  public inputAmount: BigNumber;
  public outputAmount: BigNumber;
  public feeAmount: BigNumber;

  constructor(params: StableSwapParameters, outputAmount: BigNumber, feeAmount: BigNumber) {
    this.poolId = params.poolId;
    this.inputIndex = params.inputIndex;
    this.outputIndex = params.outputIndex;
    this.inputToken = params.inputToken;
    this.outputToken = params.outputToken;
    this.inputAmount = params.inputAmount;
    this.outputAmount = outputAmount;
    this.feeAmount = feeAmount;
  }

  public toChainData(): [poolId: number, inputIndex: number, outputIndex: number, inputAmount: string, outputAmount: string] {
    return [
        this.poolId,
        this.inputIndex,
        this.outputIndex,
        FixedPointNumber.fromInner(this.inputAmount.toString(), this.inputToken.decimal).toChainData(),
        FixedPointNumber.fromInner(this.outputAmount.toString(), this.inputToken.decimal).toChainData()
    ];
  }
}