/**
 * The mint amount is smaller than the minimum amount.
 */
export class MintAmountUnderMinError extends Error {
    constructor() {
      super();
  
      this.name = 'MintAmountUnderMin';
      this.message = 'Mint Amount is under Minimum';
    }
}

/**
 * The swap output amount is smaller than the minimum amount.
 */
 export class SwapAmountUnderMinError extends Error {
    constructor() {
      super();
  
      this.name = 'SwapAmountUnderMin';
      this.message = 'Swap Output Amount is under Minimum';
    }
}

/**
 * The redeem amount is smaller than the minimum amount.
 */
 export class RedeemAmountUnderMinError extends Error {
    constructor() {
      super();
  
      this.name = 'RedeemAmountUnderMin';
      this.message = 'Redeem Amount is under Minimum';
    }
}

/**
 * The redeem amount is bigger than the maximum amount.
 */
 export class RedeemAmountOverMaxError extends Error {
    constructor() {
      super();
  
      this.name = 'RedeemAmountOverMax';
      this.message = 'Redeem Amount is over Maximum';
    }
}