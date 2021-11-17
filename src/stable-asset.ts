
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
import BigNumber from 'bignumber.js';

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
  feeRecipient: AccountId
}

export interface SwapResult {
  outputAmount: BigNumber,
  feeAmount: BigNumber
}

export interface MintResult {
  outputAmount: BigNumber,
  feeAmount: BigNumber
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
      } else {
        if (prevD.minus(d).comparedTo(one) <= 0) {
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
      c = c.times(d).div(balances[i].times(balanceLength));
    }
    c = c.times(d).div(ann.times(balanceLength));
    let b: BigNumber = sum.plus(d.div(ann));
    let prevY: BigNumber = new BigNumber(0);
    let y: BigNumber = d;

    for (let i = 0; i < 255; i++) {
      prevY = y;
      y = y.times(y).plus(c).div(y.times(new BigNumber(2)).plus(b).minus(d));
      if (y > prevY) {
        if (y.minus(prevY).comparedTo(one) <= 0) {
          break;
        }
      } else {
        if (prevY.minus(y).comparedTo(one) <= 0) {
          break;
        }
      }
    }

    return y;
  }

  public getSwapAmount(poolId: number, input: number, output: number, inputAmount: BigNumber): Observable<SwapResult> {
    return this.getPoolInfo(poolId).pipe(map((poolInfo) => {
      let feeDenominator: BigNumber = new BigNumber(10).pow(10);
      let balances: BigNumber[] = poolInfo.balances;
      let a: BigNumber = poolInfo.a;
      let d: BigNumber = poolInfo.totalSupply;
      balances[input] = balances[input].plus(inputAmount.times(poolInfo.precisions[output]));
      let y: BigNumber = this.getY(balances, output, d, a);
      let dy: BigNumber = balances[output].minus(y).minus(new BigNumber(1)).div(poolInfo.precisions[output]);

      let feeAmount: BigNumber = new BigNumber(0);
      if (poolInfo.swapFee.comparedTo(new BigNumber(0)) > 0) {
        feeAmount = dy.times(poolInfo.swapFee).div(feeDenominator);
        dy = dy.minus(feeAmount);
      }

      return {
        outputAmount: dy,
        feeAmount: feeAmount
      };
    }));
  }

  public swap(poolId: number, input: number, output: number, inputAmount: BigNumber, minOutput: BigNumber) {
    return this.api.tx.stableAsset.swap(poolId, input, output, inputAmount, minOutput);
  }

  public getMintAmount(poolId: number, inputAmounts: BigNumber[]): Observable<MintResult> {
    return this.getPoolInfo(poolId).pipe(map((poolInfo) => {
      let balances: BigNumber[] = poolInfo.balances;
      let a: BigNumber = poolInfo.a;
      let oldD: BigNumber = poolInfo.totalSupply;
      let feeDenominator: BigNumber = new BigNumber(10).pow(10);

      for (let i = 0; i < balances.length; i++) {
        if (inputAmounts[i].isZero()) {
          continue;
        }
        // balance = balance + amount * precision
        balances[i] = balances[i].plus(inputAmounts[i].times(poolInfo.precisions[i]));
      }
      let newD: BigNumber = this.getD(balances, a);
      // newD should be bigger than or equal to oldD
      let mintAmount: BigNumber = newD.minus(oldD);
      let feeAmount: BigNumber = new BigNumber(0);

      if (poolInfo.mintFee.comparedTo(new BigNumber(0)) > 0) {
        feeAmount = mintAmount.times(poolInfo.mintFee).div(feeDenominator);
        mintAmount = mintAmount.minus(feeAmount);
      }

      return {
        outputAmount: mintAmount,
        feeAmount: feeAmount
      };
    }));

  }

  public mint(poolId: number, inputAmounts: BigNumber[], minMintAmount: BigNumber) {
    return this.api.tx.stableAsset.swap(poolId, inputAmounts, minMintAmount);
  }
}
