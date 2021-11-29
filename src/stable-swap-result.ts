import { FixedPointNumber } from '@acala-network/sdk-core';

export class StableSwapResult {
  public poolId: number;
  public input: number;
  public output: number;
  public inputAmount: FixedPointNumber;
  public outputAmount: FixedPointNumber;
  public feeAmount: FixedPointNumber;

  constructor(poolId: number, input: number, output: number, inputAmount: FixedPointNumber, outputAmount: FixedPointNumber, feeAmount: FixedPointNumber) {
    this.poolId = poolId;
    this.input = input;
    this.output = output;
    this.inputAmount = inputAmount;
    this.outputAmount = outputAmount;
    this.feeAmount = feeAmount;
  }

  public toChainData(): [poolId: number, input: number, output: number, inputAmount: FixedPointNumber, minOutput: FixedPointNumber] {
    return [
        this.poolId,
        this.input,
        this.output,
        this.inputAmount,
        this.outputAmount
    ];
  }
}