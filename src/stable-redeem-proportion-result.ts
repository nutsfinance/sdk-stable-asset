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

    // Minimum output amounts are based on actual token amounts
    public getMinOutputAmounts(): FixedPointNumber[] {
        return this.outputAmounts.map(output => output.mul(new FixedPointNumber(1 - this.slippage)));
    }

    // Convert to underlying token amount before sending on chain
    public toChainData(): [poolId: number, inputAmount: string, minOutputAmounts: string[]] {
        const minOutputAmounts = [];
        for (let i = 0; i < this.outputTokens.length; i++) {
            const outputAmount = this.outputTokens[i].name === this.liquidAsset ? this.outputAmounts[i].mul(this.liquidExchangeRate) : this.outputAmounts[i];
            minOutputAmounts.push(outputAmount.mul(new FixedPointNumber(1 - this.slippage)));
        }

        return [
            this.poolId,
            this.inputAmount.toChainData(),
            minOutputAmounts.map(amount => amount.toChainData())
        ];
    }
}