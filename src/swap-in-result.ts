import { FixedPointNumber, Token } from '@acala-network/sdk-core';

export interface SwapInParameters {
  poolId: number;
  inputIndex: number;
  outputIndex: number;
  inputToken: Token;
  outputToken: Token;
  outputAmount: FixedPointNumber;
}

export class SwapInResult {
  // Display values
  public poolId: number;
  public inputIndex: number;
  public outputIndex: number;
  public inputToken: Token;
  public outputToken: Token;
  public inputAmount: FixedPointNumber;
  public outputAmount: FixedPointNumber;
  public feeAmount: FixedPointNumber;
  public slippage: number;
  public assetCount: number;
  public liquidToken: Token;
  public liquidExchangeRate: FixedPointNumber;

  constructor(params: SwapInParameters, inputAmount: FixedPointNumber, feeAmount: FixedPointNumber,
      slippage: number, assetCount: number, liquidToken: Token, liquidExchangeRate: FixedPointNumber) {
    this.poolId = params.poolId;
    this.inputIndex = params.inputIndex;
    this.outputIndex = params.outputIndex;
    this.inputToken = params.inputToken;
    this.outputToken = params.outputToken;
    this.outputAmount = params.outputAmount;
    this.inputAmount = inputAmount;
    this.feeAmount = feeAmount;
    this.assetCount = assetCount;
    this.slippage = slippage;
    this.liquidToken = liquidToken;
    this.liquidExchangeRate = liquidExchangeRate;
  }

  // Maximum input amount is in actual token amount
  public getMaxInputAmount(): FixedPointNumber {
    return this.inputAmount.mul(new FixedPointNumber(1 + this.slippage));
  }

  // Convert to underlying value sent to chain
  public toChainData(): [poolId: number, inputIndex: number, outputIndex: number, maxInputAmount: string, outputAmount: string, assetLength: number] {
    let input = this.inputToken.name === this.liquidToken.name ? this.inputAmount.mul(this.liquidExchangeRate) : this.inputAmount;
    let output = this.outputToken.name === this.liquidToken.name ? this.outputAmount.mul(this.liquidExchangeRate) : this.outputAmount;
    return [
        this.poolId,
        this.inputIndex,
        this.outputIndex,
        input.mul(new FixedPointNumber(1 + this.slippage)).toChainData(),
        output.toChainData(),
        this.assetCount
    ];
  }
}