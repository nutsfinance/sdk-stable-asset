
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { from } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { assert } from '@polkadot/util';
import { forceToCurrencyId, MaybeCurrency, Token } from '@acala-network/sdk-core';
import { CurrencyId, Position, AccountId } from '@acala-network/types/interfaces';
import { DerivedLoanType } from '@acala-network/api-derive';
import { ApiRx } from '@polkadot/api';
import { Option } from '@polkadot/types/codec';
import { Codec } from '@polkadot/types/types';
import { memoize } from 'lodash';
import { FixedPointNumber } from '@acala-network/sdk-core/fixed-point-number';

export interface PoolInfo {
  poolAsset: CurrencyId,
  assets: CurrencyId[],
  precisions: FixedPointNumber[],
  mintFee: FixedPointNumber,
  swapFee: FixedPointNumber,
  redeemFee: FixedPointNumber,
  totalSupply: FixedPointNumber,
  a: FixedPointNumber,
  balances: FixedPointNumber[],
  feeRecipient: AccountId
}

export interface SwapResult {
  outputAmount: FixedPointNumber,
  feeAmount: FixedPointNumber
}

export interface MintResult {
  outputAmount: FixedPointNumber,
  feeAmount: FixedPointNumber
}

export class StableAssetRx {
  private api: ApiRx;

  constructor(api: ApiRx) {
    this.api = api;
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
      let poolInfo: unknown = (poolInfoOption as Option<Codec>).unwrap();
      return poolInfo as PoolInfo;
    }));
  }

  private getD(balances: FixedPointNumber[], a: FixedPointNumber): FixedPointNumber {
    let sum: FixedPointNumber = new FixedPointNumber(0);
    let ann: FixedPointNumber = a;
    let balanceLength: FixedPointNumber = new FixedPointNumber(balances.length);
    let one: FixedPointNumber = new FixedPointNumber(1);

    for (let i = 0; i < balances.length; i++) {
      sum = sum.plus(balances[i]);
      ann = ann.times(balanceLength);
    }
    if (sum.isZero()) {
      return new FixedPointNumber(0);
    }

    let prevD: FixedPointNumber = new FixedPointNumber(0);
    let d: FixedPointNumber = sum;
    for (let i = 0; i < 255; i++) {
      let pD: FixedPointNumber = d;
      for (let j = 0; j < balances.length; j++) {
        pD = pD.times(d).div(balances[j].times(balanceLength));
      }
      prevD = d;
      d = ann
      .times(sum)
      .plus(pD.times(balanceLength))
      .times(d)
      .div(ann.minus(one).times(d).plus(balanceLength.plus(one).times(pD)));
      if (d > prevD) {
        if (d.minus(prevD).isLessOrEqualTo(one)) {
          break;
        }
      } else {
        if (prevD.minus(d).isLessOrEqualTo(one)) {
          break;
        }
      }
    }

    return d;
  }

  private getY(balances: FixedPointNumber[], j: number, d: FixedPointNumber, a: FixedPointNumber): FixedPointNumber {
    let c: FixedPointNumber = d;
    let sum: FixedPointNumber = new FixedPointNumber(0);
    let ann: FixedPointNumber = a;
    let balanceLength: FixedPointNumber = new FixedPointNumber(balances.length);
    let one: FixedPointNumber = new FixedPointNumber(1);

    for (let i = 0; i < balances.length; i++) {
      ann = ann.times(balanceLength);
      if (i == j) {
        continue;
      }
      sum = sum.plus(balances[i]);
      c = c.times(d).div(balances[i].times(balanceLength));
    }
    c = c.times(d).div(ann.times(balanceLength));
    let b: FixedPointNumber = sum.plus(d.div(ann));
    let prevY: FixedPointNumber = new FixedPointNumber(0);
    let y: FixedPointNumber = d;

    for (let i = 0; i < 255; i++) {
      prevY = y;
      y = y.times(y).plus(c).div(y.times(new FixedPointNumber(2)).plus(b).minus(d));
      if (y > prevY) {
        if (y.minus(prevY).isLessOrEqualTo(one)) {
          break;
        }
      } else {
        if (prevY.minus(y).isLessOrEqualTo(one)) {
          break;
        }
      }
    }

    return y;
  }

  public getSwapAmount(poolId: number, input: number, output: number, inputAmount: FixedPointNumber): Observable<SwapResult> {
    return this.getPoolInfo(poolId).pipe(map((poolInfo) => {
      let feeDenominator: FixedPointNumber = new FixedPointNumber("10000000000");
      let balances: FixedPointNumber[] = poolInfo.balances;
      let a: FixedPointNumber = poolInfo.a;
      let d: FixedPointNumber = poolInfo.totalSupply;
      balances[input] = balances[input].plus(inputAmount.times(poolInfo.precisions[output]));
      let y: FixedPointNumber = this.getY(balances, output, d, a);
      let dy: FixedPointNumber = balances[output].minus(y).minus(new FixedPointNumber(1)).div(poolInfo.precisions[output]);

      let feeAmount: FixedPointNumber = new FixedPointNumber(0);
      if (poolInfo.swapFee.isGreaterThan(new FixedPointNumber(0))) {
        feeAmount = dy.times(poolInfo.swapFee).div(feeDenominator);
        dy = dy.minus(feeAmount);
      }

      return {
        outputAmount: dy,
        feeAmount: feeAmount
      };
    }));
  }

  public swap(poolId: number, input: number, output: number, inputAmount: FixedPointNumber, minOutput: FixedPointNumber) {
    return this.api.tx.stableAsset.swap(poolId, input, output, inputAmount, minOutput);
  }

  public getMintAmount(poolId: number, inputAmounts: FixedPointNumber[]): Observable<MintResult> {
    return this.getPoolInfo(poolId).pipe(map((poolInfo) => {
      let balances: FixedPointNumber[] = poolInfo.balances;
      let a: FixedPointNumber = poolInfo.a;
      let oldD: FixedPointNumber = poolInfo.totalSupply;
      let feeDenominator: FixedPointNumber = new FixedPointNumber("10000000000");

      for (let i = 0; i < balances.length; i++) {
        if (inputAmounts[i].isZero()) {
          continue;
        }
        // balance = balance + amount * precision
        balances[i] = balances[i].plus(inputAmounts[i].times(poolInfo.precisions[i]));
      }
      let newD: FixedPointNumber = this.getD(balances, a);
      // newD should be bigger than or equal to oldD
      let mintAmount: FixedPointNumber = newD.minus(oldD);
      let feeAmount: FixedPointNumber = new FixedPointNumber(0);

      if (poolInfo.mintFee.isGreaterThan(new FixedPointNumber(0))) {
        feeAmount = mintAmount.times(poolInfo.mintFee).div(feeDenominator);
        mintAmount = mintAmount.minus(feeAmount);
      }

      return {
        outputAmount: mintAmount,
        feeAmount: feeAmount
      };
    }));

  }

  public mint(poolId: number, inputAmounts: FixedPointNumber[], minMintAmount: FixedPointNumber) {
    return this.api.tx.stableAsset.swap(poolId, inputAmounts, minMintAmount);
  }
}
