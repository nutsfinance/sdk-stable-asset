
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
  precision: BigNumber
}

export type LiquidAssetConfig = {
  [chain in string]: string;
};

const LIQUID_ASSET: LiquidAssetConfig = {
  "Acala": "LDOT",
  "Karura": "LKSM",
  "Mandala Dev": "LDOT"
};

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
        precision: new BigNumber(poolInfo.precision.toString())
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
        .plus(pD.times(balanceLength))
        .times(d)
        .idiv(ann.minus(one).times(d).plus(balanceLength.plus(one).times(pD)));
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
    c = c.times(d).idiv(ann.times(balanceLength));
    let b: BigNumber = sum.plus(d.idiv(ann));
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
      inputAmount: FixedPointNumber, liquidAssetExchangeRate: FixedPointNumber): Observable<StableSwapResult> {

    let feeDenominator: BigNumber = new BigNumber("10000000000");
    let chain = this.api.runtimeChain.toString();
    if (inputToken.name === LIQUID_ASSET[chain]) {
      inputAmount = inputAmount.div(liquidAssetExchangeRate);
    }

    return this.getPoolInfo(poolId).pipe(map((poolInfo) => {
      let balances: BigNumber[] = poolInfo.balances;
      let a: BigNumber = poolInfo.a;
      let d: BigNumber = poolInfo.totalSupply;
      balances[inputIndex] = balances[inputIndex].plus(inputAmount._getInner().times(poolInfo.precisions[outputIndex]));
      let y: BigNumber = this.getY(balances, outputIndex, d, a);
      let dy: BigNumber = balances[outputIndex].minus(y).minus(new BigNumber(1)).idiv(poolInfo.precisions[outputIndex]);

      let fee: BigNumber = new BigNumber(0);
      if (poolInfo.swapFee.isGreaterThan(new BigNumber(0))) {
        fee = dy.times(poolInfo.swapFee).idiv(feeDenominator);
        dy = dy.minus(fee);
      }
      console.log("dy: " + dy);
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
          new FixedPointNumber(0)
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
        feeAmount
      );
    }));
  }

  public getMintAmount(poolId: number, inputTokens: Token[], inputAmounts: FixedPointNumber[],
      liquidAssetExchangeRate: FixedPointNumber): Observable<StableMintResult> {
    const inputs: FixedPointNumber[] = [];
    const chain = this.api.runtimeChain.toString();
    for (let i = 0; i < inputTokens.length; i++) {
      inputs.push(inputTokens[i].name === LIQUID_ASSET[chain] ? inputAmounts[i].div(liquidAssetExchangeRate) : inputAmounts[i]);
    }

    return this.getPoolInfo(poolId).pipe(map((poolInfo) => {
      let balances: BigNumber[] = poolInfo.balances;
      let a: BigNumber = poolInfo.a;
      let oldD: BigNumber = poolInfo.totalSupply;
      let feeDenominator: BigNumber = new BigNumber("10000000000");

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
        fee = output.times(poolInfo.mintFee).idiv(feeDenominator);
        output = output.minus(fee);
      }

      const mintAmount = FixedPointNumber._fromBN(output, poolInfo.precision.toNumber());
      const feeAmount = FixedPointNumber._fromBN(fee, poolInfo.precision.toNumber());
      return new StableMintResult({
          poolId,
          inputAmounts: inputs
        },
        mintAmount,
        feeAmount
      );
    }));

  }
}
