import BigNumber from "bignumber.js";

export interface StableMintParameters {
    poolId: number;
    inputAmounts: BigNumber[];
}

export class StableMintResult {
  public poolId: number;
  public inputAmounts: BigNumber[];
  public outputAmount: BigNumber;
  public feeAmount: BigNumber;

  constructor(params: StableMintParameters, outputAmount: BigNumber, feeAmount: BigNumber) {
    this.poolId = params.poolId;
    this.inputAmounts = params.inputAmounts;
    this.outputAmount = outputAmount;
    this.feeAmount = feeAmount;
  }

  public toChainData(): [poolId: number, inputAmounts: string[], minMintAmount: string] {
    return [
        this.poolId,
        this.inputAmounts.map(input => input.toString()),
        this.outputAmount.toString()
    ];
  }
}
