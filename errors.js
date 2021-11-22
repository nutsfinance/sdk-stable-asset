"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedeemAmountOverMaxError = exports.RedeemAmountUnderMinError = exports.SwapAmountUnderMinError = exports.MintAmountUnderMinError = void 0;
/**
 * The mint amount is smaller than the minimum amount.
 */
var MintAmountUnderMinError = /** @class */ (function (_super) {
    __extends(MintAmountUnderMinError, _super);
    function MintAmountUnderMinError() {
        var _this = _super.call(this) || this;
        _this.name = 'MintAmountUnderMin';
        _this.message = 'Mint Amount is under Minimum';
        return _this;
    }
    return MintAmountUnderMinError;
}(Error));
exports.MintAmountUnderMinError = MintAmountUnderMinError;
/**
 * The swap output amount is smaller than the minimum amount.
 */
var SwapAmountUnderMinError = /** @class */ (function (_super) {
    __extends(SwapAmountUnderMinError, _super);
    function SwapAmountUnderMinError() {
        var _this = _super.call(this) || this;
        _this.name = 'SwapAmountUnderMin';
        _this.message = 'Swap Output Amount is under Minimum';
        return _this;
    }
    return SwapAmountUnderMinError;
}(Error));
exports.SwapAmountUnderMinError = SwapAmountUnderMinError;
/**
 * The redeem amount is smaller than the minimum amount.
 */
var RedeemAmountUnderMinError = /** @class */ (function (_super) {
    __extends(RedeemAmountUnderMinError, _super);
    function RedeemAmountUnderMinError() {
        var _this = _super.call(this) || this;
        _this.name = 'RedeemAmountUnderMin';
        _this.message = 'Redeem Amount is under Minimum';
        return _this;
    }
    return RedeemAmountUnderMinError;
}(Error));
exports.RedeemAmountUnderMinError = RedeemAmountUnderMinError;
/**
 * The redeem amount is bigger than the maximum amount.
 */
var RedeemAmountOverMaxError = /** @class */ (function (_super) {
    __extends(RedeemAmountOverMaxError, _super);
    function RedeemAmountOverMaxError() {
        var _this = _super.call(this) || this;
        _this.name = 'RedeemAmountOverMax';
        _this.message = 'Redeem Amount is over Maximum';
        return _this;
    }
    return RedeemAmountOverMaxError;
}(Error));
exports.RedeemAmountOverMaxError = RedeemAmountOverMaxError;
