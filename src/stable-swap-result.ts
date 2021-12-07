import BigNumber from "bignumber.js";

export interface StableSwapParameters {
  poolId: number;
  inputIndex: number;
  outputIndex: number;
  inputAmount: BigNumber;
}

export class StableSwapResult {
  public poolId: number;
  public inputIndex: number;
  public outputIndex: number;
  public inputAmount: BigNumber;
  public outputAmount: BigNumber;
  public feeAmount: BigNumber;

  constructor(params: StableSwapParameters, outputAmount: BigNumber, feeAmount: BigNumber) {
    this.poolId = params.poolId;
    this.inputIndex = params.inputIndex;
    this.outputIndex = params.outputIndex;
    this.inputAmount = params.inputAmount;
    this.outputAmount = outputAmount;
    this.feeAmount = feeAmount;
  }

  public toChainData(): [poolId: number, inputIndex: number, outputIndex: number, inputAmount: string, minOutput: string] {
    return [
        this.poolId,
        this.inputIndex,
        this.outputIndex,
        this.inputAmount.toString(),
        this.outputAmount.toString()
    ];
  }
}