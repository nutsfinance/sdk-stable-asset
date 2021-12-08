import { FixedPointNumber, Token } from '@acala-network/sdk-core';

export interface StableSwapParameters {
  poolId: number;
  inputIndex: number;
  outputIndex: number;
  inputToken: Token;
  outputToken: Token;
  inputAmount: FixedPointNumber;
}

export class StableSwapResult {
  public poolId: number;
  public inputIndex: number;
  public outputIndex: number;
  public inputToken: Token;
  public outputToken: Token;
  public inputAmount: FixedPointNumber;
  public outputAmount: FixedPointNumber;
  public feeAmount: FixedPointNumber;

  constructor(params: StableSwapParameters, outputAmount: FixedPointNumber, feeAmount: FixedPointNumber) {
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
        this.inputAmount.toChainData(),
        this.outputAmount.toChainData()
    ];
  }
}