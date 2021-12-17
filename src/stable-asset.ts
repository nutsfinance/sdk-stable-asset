
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { Token, FixedPointNumber } from '@acala-network/sdk-core';
import { CurrencyId, AccountId } from '@acala-network/types/interfaces';
import { ApiRx } from '@polkadot/api';
import { Option } from '@polkadot/types/codec';
import { Codec } from '@polkadot/types/types';
import { BigNumber } from 'bignumber.js';

import { StableSwapResult } from './stable-swap-result';
import { StableMintResult } from './stable-mint-result';
import { StableSwapParameters } from '.';
import { StableRedeemProportionResult } from './stable-redeem-proportion-result';

export interface PoolInfo {
  poolAsset: CurrencyId,
  assets: CurrencyId[],
  precisions: BigNumber[],
  mintFee: BigNumber,
  swapFee: BigNumber,
  redeemFee: BigNumber,
  totalSupply: BigNumber,
  a: BigNumber,
  balances: BigNumber[],
  feeRecipient: AccountId,
  precision: number,
}

export type LiquidAssetConfig = {
  [chain in string]: string;
};

export const LIQUID_ASSET: LiquidAssetConfig = {
  "Acala": "LDOT",
  "Karura": "LKSM",
  "Acala Karura Dev": "LKSM",
  "Mandala Dev": "LDOT"
};

const FEE_DENOMINATOR: BigNumber = new BigNumber("10000000000");
const A_PRECISION: BigNumber = new BigNumber("100");

export class StableAssetRx {
  private api: ApiRx;
  private pools$ = new BehaviorSubject<PoolInfo[]>([]);

  constructor(api: ApiRx) {
    this.api = api;
    this.getAvailablePools().subscribe(pools => this.pools$.next(pools));
  }

  get availablePools(): PoolInfo[] {
    return this.pools$.value;
  }

  public getAvailablePools(): Observable<PoolInfo[]> {
    return this.api.query.stableAsset.poolCount()
      .pipe(
        mergeMap(res => {
          let count: unknown = res;
          let arr = [];
          for (let i = 0; i < (count as number); i++) {
            arr.push(this.getPoolInfo(i));
          }
          return combineLatest(arr);
        }));
  }

  public getPoolInfo(poolId: number): Observable<PoolInfo> {
    return this.api.query.stableAsset.pools(poolId).pipe(map(poolInfoOption => {
      let poolInfo: any = (poolInfoOption as Option<Codec>).unwrap();
      return {
        poolAsset: poolInfo.poolAsset,
        assets: poolInfo.assets,
        precisions: this.convertToFixPointNumber(poolInfo.precisions),
        mintFee: new BigNumber(poolInfo.mintFee.toString()),
        swapFee: new BigNumber(poolInfo.swapFee.toString()),
        redeemFee: new BigNumber(poolInfo.redeemFee.toString()),
        totalSupply: new BigNumber(poolInfo.totalSupply.toString()),
        a: new BigNumber(poolInfo.a.toString()),
        balances: this.convertToFixPointNumber(poolInfo.balances),
        feeRecipient: poolInfo.feeRecipient,
        precision: poolInfo.precision.toNumber(),
      }
    }));
  }

  private convertToFixPointNumber(a: any[]): BigNumber[] {
    let result: BigNumber[] = [];
    for (let i = 0; i < a.length; i++) {
      result.push(new BigNumber(a[i].toString()));
    }
    return result;
  }

  private getD(balances: BigNumber[], a: BigNumber): BigNumber {
    let sum: BigNumber = new BigNumber(0);
    let ann: BigNumber = a;
    let balanceLength: BigNumber = new BigNumber(balances.length);
    let one: BigNumber = new BigNumber(1);

    for (let i = 0; i < balances.length; i++) {
      sum = sum.plus(balances[i]);
      ann = ann.times(balanceLength);
    }
    if (sum.isZero()) {
      return new BigNumber(0);
    }

    let prevD: BigNumber = new BigNumber(0);
    let d: BigNumber = sum;
    for (let i = 0; i < 255; i++) {
      let pD: BigNumber = d;
      for (let j = 0; j < balances.length; j++) {
        pD = pD.times(d).idiv(balances[j].times(balanceLength));
      }
      prevD = d;
      d = ann
        .times(sum)
        .idiv(A_PRECISION)
        .plus(pD.times(balanceLength))
        .times(d)
        .idiv(ann.minus(A_PRECISION).times(d).idiv(A_PRECISION).plus(balanceLength.plus(one).times(pD)));
      if (d.comparedTo(prevD) > 0) {
        if (d.minus(prevD).isLessThanOrEqualTo(one)) {
          break;
        }
      } else {
        if (prevD.minus(d).isLessThanOrEqualTo(one)) {
          break;
        }
      }
    }

    return d;
  }

  private getY(balances: BigNumber[], j: number, d: BigNumber, a: BigNumber): BigNumber {
    let c: BigNumber = d;
    let sum: BigNumber = new BigNumber(0);
    let ann: BigNumber = a;
    let balanceLength: BigNumber = new BigNumber(balances.length);
    let one: BigNumber = new BigNumber(1);

    for (let i = 0; i < balances.length; i++) {
      ann = ann.times(balanceLength);
      if (i == j) {
        continue;
      }
      sum = sum.plus(balances[i]);
      c = c.times(d).idiv(balances[i].times(balanceLength));
    }
    c = c.times(d).times(A_PRECISION).idiv(ann.times(balanceLength));
    let b: BigNumber = sum.plus(d.times(A_PRECISION).idiv(ann));
    let prevY: BigNumber = new BigNumber(0);
    let y: BigNumber = d;

    for (let i = 0; i < 255; i++) {
      prevY = y;
      y = y.times(y).plus(c).idiv(y.times(new BigNumber(2)).plus(b).minus(d));
      if (y.comparedTo(prevY) > 0) {
        if (y.minus(prevY).isLessThanOrEqualTo(one)) {
          break;
        }
      } else {
        if (prevY.minus(y).isLessThanOrEqualTo(one)) {
          break;
        }
      }
    }

    return y;
  }

  public getSwapAmount(poolId: number, inputIndex: number, outputIndex: number, inputToken: Token, outputToken: Token,
      inputAmount: FixedPointNumber, slippage: number, liquidAssetExchangeRate: FixedPointNumber): Observable<StableSwapResult> {

    return this.getPoolInfo(poolId).pipe(map((poolInfo) => {
      let balances: BigNumber[] = poolInfo.balances;
      let a: BigNumber = poolInfo.a;
      let d: BigNumber = poolInfo.totalSupply;

      let chain = this.api.runtimeChain.toString();
      let input = inputToken.name === LIQUID_ASSET[chain] ? inputAmount.div(liquidAssetExchangeRate) : inputAmount;
      balances[inputIndex] = balances[inputIndex].plus(input._getInner().times(poolInfo.precisions[outputIndex]));
      let y: BigNumber = this.getY(balances, outputIndex, d, a);
      let dy: BigNumber = balances[outputIndex].minus(y).minus(new BigNumber(1)).idiv(poolInfo.precisions[outputIndex]);

      let fee: BigNumber = new BigNumber(0);
      if (poolInfo.swapFee.isGreaterThan(new BigNumber(0))) {
        fee = dy.times(poolInfo.swapFee).idiv(FEE_DENOMINATOR);
        dy = dy.minus(fee);
      }
      const swapParamters: StableSwapParameters = {
        poolId,
        inputIndex,
        outputIndex,
        inputToken,
        outputToken,
        inputAmount
      };
      if (dy.isLessThan(new BigNumber(0))) {
        return new StableSwapResult(
          swapParamters,
          new FixedPointNumber(0),
          new FixedPointNumber(0),
          slippage,
          LIQUID_ASSET[chain],
          liquidAssetExchangeRate
        );
      }

      let outputAmount = FixedPointNumber._fromBN(dy, outputToken.decimal);
      let feeAmount = FixedPointNumber._fromBN(fee, outputToken.decimal);
      if (outputToken.name === LIQUID_ASSET[chain]) {
        outputAmount = outputAmount.mul(liquidAssetExchangeRate);
        feeAmount = feeAmount.mul(liquidAssetExchangeRate);
      }
      return new StableSwapResult(
        swapParamters,
        outputAmount,
        feeAmount,
        slippage,
        LIQUID_ASSET[chain],
        liquidAssetExchangeRate
      );
    }));
  }

  public getMintAmount(poolId: number, inputTokens: Token[], inputAmounts: FixedPointNumber[],
      slippage: number, liquidExchangeRate: FixedPointNumber): Observable<StableMintResult> {
    const inputs: FixedPointNumber[] = [];
    const chain = this.api.runtimeChain.toString();
    for (let i = 0; i < inputTokens.length; i++) {
      inputs.push(inputTokens[i].name === LIQUID_ASSET[chain] ? inputAmounts[i].div(liquidExchangeRate) : inputAmounts[i]);
    }

    return this.getPoolInfo(poolId).pipe(map((poolInfo) => {
      let balances: BigNumber[] = poolInfo.balances;
      let a: BigNumber = poolInfo.a;
      let oldD: BigNumber = poolInfo.totalSupply;

      for (let i = 0; i < balances.length; i++) {
        if (inputs[i].isZero()) {
          continue;
        }
        // balance = balance + amount * precision
        balances[i] = balances[i].plus(inputs[i]._getInner().times(poolInfo.precisions[i]));
      }
      let newD: BigNumber = this.getD(balances, a);
      // newD should be bigger than or equal to oldD
      let output: BigNumber = newD.minus(oldD);
      let fee: BigNumber = new BigNumber(0);
      if (poolInfo.mintFee.isGreaterThan(new BigNumber(0))) {
        fee = output.times(poolInfo.mintFee).idiv(FEE_DENOMINATOR);
        output = output.minus(fee);
      }

      const mintAmount = FixedPointNumber._fromBN(output, Math.log10(poolInfo.precision));
      const feeAmount = FixedPointNumber._fromBN(fee, Math.log10(poolInfo.precision));
      return new StableMintResult({
          poolId,
          inputTokens,
          inputAmounts
        },
        mintAmount,
        feeAmount,
        slippage,
        LIQUID_ASSET[chain],
        liquidExchangeRate
      );
    }));
  }

  public getRedeemProportionAmount(poolId: number, inputAmount: FixedPointNumber, outputTokens: Token[],
    slippage: number, liquidExchangeRate: FixedPointNumber): Observable<StableRedeemProportionResult> {
      // TODO Total supply should consider yield
    return this.getPoolInfo(poolId).pipe(map((poolInfo) => {
      const chain = this.api.runtimeChain.toString();
      let balances: BigNumber[] = poolInfo.balances;
      let totalSupply: BigNumber = poolInfo.totalSupply;
      let feeAmount = inputAmount._getInner().times(poolInfo.redeemFee).idiv(FEE_DENOMINATOR);
      let actualInputAmount = inputAmount._getInner().minus(feeAmount);

      let outputAmounts: FixedPointNumber[] = [];
      for (let i = 0; i < balances.length; i++) {
        const outputAmount = balances[i].multipliedBy(actualInputAmount).idiv(totalSupply);
        outputAmounts.push(FixedPointNumber._fromBN(outputAmount, outputTokens[i].decimal));
      }

      return new StableRedeemProportionResult({
          poolId,
          inputAmount,
          outputTokens
        },
        outputAmounts,
        FixedPointNumber._fromBN(feeAmount, poolInfo.precision),
        slippage,
        LIQUID_ASSET[chain],
        liquidExchangeRate
      );
    }));
  }
}
