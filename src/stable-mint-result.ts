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
  public minMintAmount: FixedPointNumber;

  constructor(params: StableMintParameters, outputAmount: FixedPointNumber, feeAmount: FixedPointNumber, minMintAmount: FixedPointNumber) {
    this.poolId = params.poolId;
    this.inputAmounts = params.inputAmounts;
    this.outputAmount = outputAmount;
    this.feeAmount = feeAmount;
    this.minMintAmount = minMintAmount;
  }

  public toChainData(): [poolId: number, inputAmounts: string[], minMintAmount: string] {
    return [
        this.poolId,
        this.inputAmounts.map(input => input.toChainData()),
        this.minMintAmount.toChainData()
    ];
  }
}
