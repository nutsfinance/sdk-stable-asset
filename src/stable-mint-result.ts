import { FixedPointNumber, TokenBalance } from '@acala-network/sdk-core';

export class StableMintResult {
  public poolId: number;
  public inputAmounts: FixedPointNumber[];
  public incrementShareWithSlippage: FixedPointNumber;
  public mintFee: FixedPointNumber;

  constructor(poolId: number, inputAmounts: FixedPointNumber[],
    incrementShareWithSlippage: FixedPointNumber, fee: FixedPointNumber) {
    this.poolId = poolId;
    this.inputAmounts = inputAmounts;
    this.incrementShareWithSlippage = incrementShareWithSlippage;
    this.mintFee = fee;
  }

  public toChainData(): [poolId: number, inputAmounts: string[], minMintAmount: string] {
    return [
        this.poolId,
        this.inputAmounts.map(input => input.toChainData()),
        this.incrementShareWithSlippage.toChainData()
    ];
  }
}
