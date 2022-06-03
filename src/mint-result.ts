import { FixedPointNumber, Token } from '@acala-network/sdk-core';

export interface MintParameters {
    poolId: number;
    inputTokens: Token[];
    inputAmounts: FixedPointNumber[];
}

export class MintResult {
  // Display values
  public poolId: number;
  public inputTokens: Token[];
  public inputAmounts: FixedPointNumber[];
  public outputAmount: FixedPointNumber;
  public feeAmount: FixedPointNumber;
  public slippage: number;
  public liquidToken: Token;
  public liquidExchangeRate: FixedPointNumber;

  constructor(params: MintParameters, outputAmount: FixedPointNumber, feeAmount: FixedPointNumber,
    slippage: number, liquidToken: Token, liquidExchangeRate: FixedPointNumber) {
    this.poolId = params.poolId;
    this.inputTokens = params.inputTokens;
    this.inputAmounts = params.inputAmounts;
    this.outputAmount = outputAmount;
    this.feeAmount = feeAmount;
    this.slippage = slippage;
    this.liquidToken = liquidToken;
    this.liquidExchangeRate = liquidExchangeRate;
  }

  // Minimum mint amount is actual token amount
  public getMinMintAmount(): FixedPointNumber {
    return this.outputAmount.mul(new FixedPointNumber(1 - this.slippage));
  }

  // Convert to underlying value before sending on chain
  public toChainData(): [poolId: number, inputAmounts: string[], minMintAmount: string] {
    const inputs: FixedPointNumber[] = [];
    for (let i = 0; i < this.inputTokens.length; i++) {
      inputs.push(this.inputTokens[i].name === this.liquidToken.name ? this.inputAmounts[i].mul(this.liquidExchangeRate) : this.inputAmounts[i]);
    }
    return [
        this.poolId,
        inputs.map(input => input.toChainData()),
        this.getMinMintAmount().toChainData()
    ];
  }
}
