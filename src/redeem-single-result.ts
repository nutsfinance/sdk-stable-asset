import { FixedPointNumber, Token } from '@acala-network/sdk-core';

export interface RedeemSingleParameters {
    poolId: number;
    inputAmount: FixedPointNumber;
    outputIndex: number;
    outputToken: Token;
}

export class RedeemSingleResult {
    // Display values
    public poolId: number;
    public inputAmount: FixedPointNumber;
    public outputIndex: number;
    public outputToken: Token;
    public outputAmount: FixedPointNumber;
    public feeAmount: FixedPointNumber;
    public slippage: number;
    public liquidToken: Token;
    public liquidExchangeRate: FixedPointNumber;
    public assetCount: number;

    constructor(params: RedeemSingleParameters, outputAmount: FixedPointNumber, feeAmount: FixedPointNumber,
        slippage: number, liquidToken: Token, liquidExchangeRate: FixedPointNumber, assetCount: number) {
        this.poolId = params.poolId;
        this.inputAmount = params.inputAmount;
        this.outputIndex = params.outputIndex;
        this.outputToken = params.outputToken;
        this.outputAmount = outputAmount;
        this.feeAmount = feeAmount;
        this.slippage = slippage;
        this.liquidToken = liquidToken;
        this.liquidExchangeRate = liquidExchangeRate;
        this.assetCount = assetCount;
    }

    // Returns the actual output token amount
    public getOutputAmount(): FixedPointNumber {
        return this.outputToken.name === this.liquidToken.name ? this.outputAmount.mul(this.liquidExchangeRate) : this.outputAmount;
    }

    // Convert to underlying token amount before sending on chain
    public toChainData(): [poolId: number, inputAmount: string, outputIndex: number, minOutputAmount: string, assetCount: number] {
        const outputAmount = this.outputToken.name === this.liquidToken.name ? this.outputAmount.mul(this.liquidExchangeRate) : this.outputAmount;

        return [
            this.poolId,
            this.inputAmount.toChainData(),
            this.outputIndex,
            outputAmount.mul(new FixedPointNumber(1 - this.slippage)).toChainData(),
            this.assetCount
        ];
    }
}