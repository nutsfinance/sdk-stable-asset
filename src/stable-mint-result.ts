import { FixedPointNumber, TokenBalance } from '@acala-network/sdk-core';

export class StableMintResult {
  public poolId: number;
  public inputs: TokenBalance[];
  public output: TokenBalance;
  public mintFee: FixedPointNumber;

  constructor(poolId: number, inputs: TokenBalance[], output: TokenBalance, fee: FixedPointNumber) {
    this.poolId = poolId;
    this.inputs = inputs;
    this.output = output;
    this.mintFee = fee;
  }

  public toChainData(): [poolId: number, inputAmounts: string[], minMintAmount: string] {
    return [
        this.poolId,
        this.inputs.map(input => input.balance.toChainData()),
        this.output.balance.toChainData()
    ];
  }
}