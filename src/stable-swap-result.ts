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
  public liquidAsset: string;
  public liquidExchangeRate: FixedPointNumber;

  constructor(params: StableSwapParameters, outputAmount: FixedPointNumber, feeAmount: FixedPointNumber,
      slippage: number, assetCount: number, liquidAsset: string, liquidExchangeRate: FixedPointNumber) {
    this.poolId = params.poolId;
    this.inputIndex = params.inputIndex;
    this.outputIndex = params.outputIndex;
    this.inputToken = params.inputToken;
    this.outputToken = params.outputToken;
    this.inputAmount = params.inputAmount;
    this.outputAmount = outputAmount;
    this.feeAmount = feeAmount;
    this.assetCount = assetCount;
    this.slippage = slippage;
    this.liquidAsset = liquidAsset;
    this.liquidExchangeRate = liquidExchangeRate;
  }

  // Convert to actual value sent to chain
  public toChainData(): [poolId: number, inputIndex: number, outputIndex: number, inputAmount: string, minMintAmount: string, assetLength: number] {
    let input = this.inputToken.name === this.liquidAsset ? this.inputAmount.mul(this.liquidExchangeRate) : this.inputAmount;
    let output = this.outputToken.name === this.liquidAsset ? this.outputAmount.mul(this.liquidExchangeRate) : this.outputAmount;
    return [
        this.poolId,
        this.inputIndex,
        this.outputIndex,
        input.toChainData(),
        output.mul(new FixedPointNumber(1 - this.slippage)).toChainData(),
        this.assetCount
    ];
  }
}