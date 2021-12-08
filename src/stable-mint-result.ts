import { FixedPointNumber, Token } from '@acala-network/sdk-core';

export interface StableMintParameters {
    poolId: number;
    inputAmounts: FixedPointNumber[];
}

export class StableMintResult {
  public poolId: number;
  public inputAmounts: FixedPointNumber[];
  public outputAmount: FixedPointNumber;
  public feeAmount: FixedPointNumber;

  constructor(params: StableMintParameters, outputAmount: FixedPointNumber, feeAmount: FixedPointNumber) {
    this.poolId = params.poolId;
    this.inputAmounts = params.inputAmounts;
    this.outputAmount = outputAmount;
    this.feeAmount = feeAmount;
  }

  public toChainData(): [poolId: number, inputAmounts: string[], outputAmount: string] {
    return [
        this.poolId,
        this.inputAmounts.map(input => input.toChainData()),
        this.outputAmount.toChainData()
    ];
  }
}
