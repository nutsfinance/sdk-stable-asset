"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StableAssetRx = void 0;
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var bignumber_js_1 = __importDefault(require("bignumber.js"));
var StableAssetRx = /** @class */ (function () {
    function StableAssetRx(api) {
        this.api = api;
    }
    StableAssetRx.prototype.getAvailablePools = function () {
        var _this = this;
        return this.api.query.stableAsset.poolCount()
            .pipe((0, operators_1.mergeMap)(function (res) {
            var count = res;
            var arr = [];
            for (var i = 0; i < count; i++) {
                arr.push(_this.getPoolInfo(i));
            }
            return (0, rxjs_1.combineLatest)(arr);
        }));
    };
    StableAssetRx.prototype.getPoolInfo = function (poolId) {
        return this.api.query.stableAsset.pools(poolId).pipe((0, operators_1.map)(function (poolInfoOption) {
            var poolInfo = poolInfoOption.unwrap();
            return poolInfo;
        }));
    };
    StableAssetRx.prototype.getD = function (balances, a) {
        var sum = new bignumber_js_1.default(0);
        var ann = a;
        var balanceLength = new bignumber_js_1.default(balances.length);
        var one = new bignumber_js_1.default(1);
        for (var i = 0; i < balances.length; i++) {
            sum = sum.plus(balances[i]);
            ann = ann.times(balanceLength);
        }
        if (sum.isZero()) {
            return new bignumber_js_1.default(0);
        }
        var prevD = new bignumber_js_1.default(0);
        var d = sum;
        for (var i = 0; i < 255; i++) {
            var pD = d;
            for (var j = 0; j < balances.length; j++) {
                pD = pD.times(d).div(balances[j].times(balanceLength));
            }
            prevD = d;
            d = ann
                .times(sum)
                .plus(pD.times(balanceLength))
                .times(d)
                .div(ann.minus(one).times(d).plus(balanceLength.plus(one).times(pD)));
            if (d > prevD) {
                if (d.minus(prevD).comparedTo(one) <= 0) {
                    break;
                }
            }
            else {
                if (prevD.minus(d).comparedTo(one) <= 0) {
                    break;
                }
            }
        }
        return d;
    };
    StableAssetRx.prototype.getY = function (balances, j, d, a) {
        var c = d;
        var sum = new bignumber_js_1.default(0);
        var ann = a;
        var balanceLength = new bignumber_js_1.default(balances.length);
        var one = new bignumber_js_1.default(1);
        for (var i = 0; i < balances.length; i++) {
            ann = ann.times(balanceLength);
            if (i == j) {
                continue;
            }
            sum = sum.plus(balances[i]);
            c = c.times(d).div(balances[i].times(balanceLength));
        }
        c = c.times(d).div(ann.times(balanceLength));
        var b = sum.plus(d.div(ann));
        var prevY = new bignumber_js_1.default(0);
        var y = d;
        for (var i = 0; i < 255; i++) {
            prevY = y;
            y = y.times(y).plus(c).div(y.times(new bignumber_js_1.default(2)).plus(b).minus(d));
            if (y > prevY) {
                if (y.minus(prevY).comparedTo(one) <= 0) {
                    break;
                }
            }
            else {
                if (prevY.minus(y).comparedTo(one) <= 0) {
                    break;
                }
            }
        }
        return y;
    };
    StableAssetRx.prototype.getSwapAmount = function (poolId, input, output, inputAmount) {
        var _this = this;
        return this.getPoolInfo(poolId).pipe((0, operators_1.map)(function (poolInfo) {
            var feeDenominator = new bignumber_js_1.default(10).pow(10);
            var balances = poolInfo.balances;
            var a = poolInfo.a;
            var d = poolInfo.totalSupply;
            balances[input] = balances[input].plus(inputAmount.times(poolInfo.precisions[output]));
            var y = _this.getY(balances, output, d, a);
            var dy = balances[output].minus(y).minus(new bignumber_js_1.default(1)).div(poolInfo.precisions[output]);
            var feeAmount = new bignumber_js_1.default(0);
            if (poolInfo.swapFee.comparedTo(new bignumber_js_1.default(0)) > 0) {
                feeAmount = dy.times(poolInfo.swapFee).div(feeDenominator);
                dy = dy.minus(feeAmount);
            }
            return {
                outputAmount: dy,
                feeAmount: feeAmount
            };
        }));
    };
    StableAssetRx.prototype.swap = function (poolId, input, output, inputAmount, minOutput) {
        return this.api.tx.stableAsset.swap(poolId, input, output, inputAmount, minOutput);
    };
    StableAssetRx.prototype.getMintAmount = function (poolId, inputAmounts) {
        var _this = this;
        return this.getPoolInfo(poolId).pipe((0, operators_1.map)(function (poolInfo) {
            var balances = poolInfo.balances;
            var a = poolInfo.a;
            var oldD = poolInfo.totalSupply;
            var feeDenominator = new bignumber_js_1.default(10).pow(10);
            for (var i = 0; i < balances.length; i++) {
                if (inputAmounts[i].isZero()) {
                    continue;
                }
                // balance = balance + amount * precision
                balances[i] = balances[i].plus(inputAmounts[i].times(poolInfo.precisions[i]));
            }
            var newD = _this.getD(balances, a);
            // newD should be bigger than or equal to oldD
            var mintAmount = newD.minus(oldD);
            var feeAmount = new bignumber_js_1.default(0);
            if (poolInfo.mintFee.comparedTo(new bignumber_js_1.default(0)) > 0) {
                feeAmount = mintAmount.times(poolInfo.mintFee).div(feeDenominator);
                mintAmount = mintAmount.minus(feeAmount);
            }
            return {
                outputAmount: mintAmount,
                feeAmount: feeAmount
            };
        }));
    };
    StableAssetRx.prototype.mint = function (poolId, inputAmounts, minMintAmount) {
        return this.api.tx.stableAsset.swap(poolId, inputAmounts, minMintAmount);
    };
    return StableAssetRx;
}());
exports.StableAssetRx = StableAssetRx;
