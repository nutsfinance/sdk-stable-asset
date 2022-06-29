import { FixedPointNumber, Token } from '@acala-network/sdk-core';

export interface RedeemSingleParameters {
    poolId: number;
    inputAmount: FixedPointNumber;
    outputToken: Token;
}

export class RedeemSingleResult {
    // Display values
    public poolId: number;
    public inputAmount: FixedPointNumber;
    public outputToken: Token;
    public outputAmount: FixedPointNumber;
    public feeAmount: FixedPointNumber;
    public slippage: number;
    public liquidToken: Token;
    public liquidExchangeRate: FixedPointNumber;

    constructor(params: RedeemSingleParameters, outputAmount: FixedPointNumber, feeAmount: FixedPointNumber,
        slippage: number, liquidToken: Token, liquidExchangeRate: FixedPointNumber) {
        this.poolId = params.poolId;
        this.inputAmount = params.inputAmount;
        this.outputToken = params.outputToken;
        this.outputAmount = outputAmount;
        this.feeAmount = feeAmount;
        this.slippage = slippage;
        this.liquidToken = liquidToken;
        this.liquidExchangeRate = liquidExchangeRate;
    }

    // Minimum output amount are based on actual token amounts
    public getMinOutputAmount(): FixedPointNumber {
        return this.outputAmount.mul(new FixedPointNumber(1 - this.slippage));
    }

    // Convert to underlying token amount before sending on chain
    public toChainData(): [poolId: number, inputAmount: string, minOutputAmount: string] {
        const outputAmount = this.outputToken.name === this.liquidToken.name ? this.outputAmount.mul(this.liquidExchangeRate) : this.outputAmount;

        return [
            this.poolId,
            this.inputAmount.toChainData(),
            outputAmount.mul(new FixedPointNumber(1 - this.slippage)).toChainData()
        ];
    }
}