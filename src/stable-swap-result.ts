import { FixedPointNumber, TokenBalance } from '@acala-network/sdk-core';

export class StableSwapResult {
  public poolId: number;
  public inputIndex: number;
  public outputIndex: number;
  public input: TokenBalance;
  public output: TokenBalance;
  public exchangeFee: FixedPointNumber;
  public exchangeRate: FixedPointNumber;

  constructor(poolId: number, inputIndex: number, outputIndex: number, input: TokenBalance, output: TokenBalance, feeAmount: FixedPointNumber) {
    this.poolId = poolId;
    this.inputIndex = inputIndex;
    this.outputIndex = outputIndex;
    this.input = input;
    this.output = output;
    this.exchangeFee = feeAmount;
    this.exchangeRate = output.balance.div(input.balance);
  }

  public toChainData(): [poolId: number, inputIndex: number, outputIndex: number, inputAmount: FixedPointNumber, minOutput: FixedPointNumber] {
    return [
        this.poolId,
        this.inputIndex,
        this.outputIndex,
        this.input.balance,
        this.output.balance
    ];
  }
}