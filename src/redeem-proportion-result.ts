import { FixedPointNumber, Token } from '@acala-network/sdk-core';

export interface RedeemProportionParameters {
    poolId: number;
    inputAmount: FixedPointNumber;
    outputTokens: Token[];
}

export class RedeemProportionResult {
    // Display values
    public poolId: number;
    public inputAmount: FixedPointNumber;
    public outputTokens: Token[];
    public outputAmounts: FixedPointNumber[];
    public feeAmount: FixedPointNumber;
    public slippage: number;
    public liquidToken: Token;
    public liquidExchangeRate: FixedPointNumber;

    constructor(params: RedeemProportionParameters, outputAmounts: FixedPointNumber[], feeAmount: FixedPointNumber,
        slippage: number, liquidToken: Token, liquidExchangeRate: FixedPointNumber) {
        this.poolId = params.poolId;
        this.inputAmount = params.inputAmount;
        this.outputTokens = params.outputTokens;
        this.outputAmounts = outputAmounts;
        this.feeAmount = feeAmount;
        this.slippage = slippage;
        this.liquidToken = liquidToken;
        this.liquidExchangeRate = liquidExchangeRate;
    }

    // Returns the actual output token amount
    public getOutputAmounts(): FixedPointNumber[] {
        const actualOutputAmounts = [];
        for (let i = 0; i < this.outputTokens.length; i++) {
            const outputAmount = this.outputTokens[i].name === this.liquidToken.name ? this.outputAmounts[i].mul(this.liquidExchangeRate) : this.outputAmounts[i];
            actualOutputAmounts.push(outputAmount);
        }

        return actualOutputAmounts;
    }

    // Convert to underlying token amount before sending on chain
    public toChainData(): [poolId: number, inputAmount: string, minOutputAmounts: string[]] {
        const minOutputAmounts = [];
        for (let i = 0; i < this.outputTokens.length; i++) {
            const outputAmount = this.outputTokens[i].name === this.liquidToken.name ? this.outputAmounts[i].mul(this.liquidExchangeRate) : this.outputAmounts[i];
            minOutputAmounts.push(outputAmount.mul(new FixedPointNumber(1 - this.slippage)));
        }

        return [
            this.poolId,
            this.inputAmount.toChainData(),
            minOutputAmounts.map(amount => amount.toChainData())
        ];
    }
}