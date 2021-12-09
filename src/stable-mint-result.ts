import { FixedPointNumber, Token } from '@acala-network/sdk-core';

export interface StableMintParameters {
    poolId: number;
    inputTokens: Token[];
    inputAmounts: FixedPointNumber[];
}

export class StableMintResult {
  // Display values
  public poolId: number;
  public inputTokens: Token[];
  public inputAmounts: FixedPointNumber[];
  public outputAmount: FixedPointNumber;
  public feeAmount: FixedPointNumber;
  public slippage: number;
  public liquidAsset: string;
  public liquidExchangeRate: FixedPointNumber;

  constructor(params: StableMintParameters, outputAmount: FixedPointNumber, feeAmount: FixedPointNumber,
    slippage: number, liquidAsset: string, liquidExchangeRate: FixedPointNumber) {
    this.poolId = params.poolId;
    this.inputTokens = params.inputTokens;
    this.inputAmounts = params.inputAmounts;
    this.outputAmount = outputAmount;
    this.feeAmount = feeAmount;
    this.slippage = slippage;
    this.liquidAsset = liquidAsset;
    this.liquidExchangeRate = liquidExchangeRate;
  }

  // Convert to actual value sent on chain
  public toChainData(): [poolId: number, inputAmounts: string[], minMintAmount: string] {
    const inputs: FixedPointNumber[] = [];
    for (let i = 0; i < this.inputTokens.length; i++) {
      inputs.push(this.inputTokens[i].name === this.liquidAsset ? this.inputAmounts[i].div(this.liquidExchangeRate) : this.inputAmounts[i]);
    }
    return [
        this.poolId,
        inputs.map(input => input.toChainData()),
        this.outputAmount.mul(new FixedPointNumber(1 - this.slippage)).toChainData()
    ];
  }
}
