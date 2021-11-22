/**
 * The mint amount is smaller than the minimum amount.
 */
export declare class MintAmountUnderMinError extends Error {
    constructor();
}
/**
 * The swap output amount is smaller than the minimum amount.
 */
export declare class SwapAmountUnderMinError extends Error {
    constructor();
}
/**
 * The redeem amount is smaller than the minimum amount.
 */
export declare class RedeemAmountUnderMinError extends Error {
    constructor();
}
/**
 * The redeem amount is bigger than the maximum amount.
 */
export declare class RedeemAmountOverMaxError extends Error {
    constructor();
}
