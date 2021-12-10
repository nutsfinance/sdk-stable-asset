import { FixedPointNumber, Token } from '@acala-network/sdk-core';

export interface StableRedeemProportionParameters {
    poolId: number;
    inputAmount: FixedPointNumber;
    outputTokens: Token[];
}

export class StableRedeemProportionResult {
    // Display values
    public poolId: number;
    public inputAmount: FixedPointNumber;
    public outputTokens: Token[];
    public outputAmounts: FixedPointNumber[];
    public feeAmount: FixedPointNumber;
    public slippage: number;
    public liquidAsset: string;
    public liquidExchangeRate: FixedPointNumber;

    constructor(params: StableRedeemProportionParameters, outputAmounts: FixedPointNumber[], feeAmount: FixedPointNumber,
        slippage: number, liquidAsset: string, liquidExchangeRate: FixedPointNumber) {
        this.poolId = params.poolId;
        this.inputAmount = params.inputAmount;
        this.outputTokens = params.outputTokens;
        this.outputAmounts = outputAmounts;
        this.feeAmount = feeAmount;
        this.slippage = slippage;
        this.liquidAsset = liquidAsset;
        this.liquidExchangeRate = liquidExchangeRate;
    }

    public getMinOutputAmount(): FixedPointNumber[] {
        const outputs: FixedPointNumber[] = [];
        for (let i = 0; i < this.outputTokens.length; i++) {
            outputs.push(this.outputTokens[i].name === this.liquidAsset ? this.outputAmounts[i].div(this.liquidExchangeRate) : this.outputAmounts[i]);
        }

        return outputs.map(output => output.mul(new FixedPointNumber(1 - this.slippage)));
    }

    public toChainData(): [poolId: number, inputAmount: string, minOutputAmounts: string[]] {
        return [
            this.poolId,
            this.inputAmount.toChainData(),
            this.getMinOutputAmount().map(amount => amount.toChainData())
        ];
    }
}