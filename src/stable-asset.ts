import { Observable, combineLatest, BehaviorSubject } from "rxjs";
import { map, mergeMap } from "rxjs/operators";
import { TokenType, FixedPointNumber } from "@acala-network/sdk-core";
import { Wallet } from "@acala-network/sdk";
import { AccountId } from "@acala-network/types/interfaces";
import { AcalaPrimitivesCurrencyCurrencyId } from '@polkadot/types/lookup';
import { ApiRx } from "@polkadot/api";
import { Option } from "@polkadot/types/codec";
import { Codec } from "@polkadot/types/types";
import { BigNumber } from "bignumber.js";

import { SwapOutParameters, SwapOutResult } from "./swap-out-result";
import { SwapInParameters, SwapInResult } from "./swap-in-result";
import { MintResult } from "./mint-result";
import { RedeemProportionResult } from "./redeem-proportion-result";
import { RedeemSingleResult } from "./redeem-single-result";

import '@acala-network/types/lookup/types-acala'

export interface PoolInfo {
  poolAsset: AcalaPrimitivesCurrencyCurrencyId;
  assets: AcalaPrimitivesCurrencyCurrencyId[];
  precisions: BigNumber[];
  mintFee: BigNumber;
  swapFee: BigNumber;
  redeemFee: BigNumber;
  totalSupply: BigNumber;
  a: BigNumber;
  aBlock: BigNumber;
  futureA: BigNumber;
  futureABlock: BigNumber;
  balances: BigNumber[];
  feeRecipient: AccountId;
  accountId: AccountId;
  precision: number;
}

interface BlockNumberWrap {
  poolInfo: PoolInfo;
  blockNumber: BigNumber;
}

const FEE_DENOMINATOR: BigNumber = new BigNumber("10000000000");
const A_PRECISION: BigNumber = new BigNumber("100");
const SWAP_EXACT_OVER_AMOUNT: BigNumber = new BigNumber("100");

export class StableAssetRx {
  private api: ApiRx;
  private wallet: Wallet;
  private pools$ = new BehaviorSubject<PoolInfo[]>([]);

  constructor(api: ApiRx) {
    this.api = api;
    this.wallet = new Wallet(api);
    this.subscribeAllPools().subscribe((pools) => this.pools$.next(pools));
    this.wallet.subscribeTokens([
      TokenType.BASIC,
      TokenType.ERC20,
      TokenType.FOREIGN_ASSET,
      TokenType.STABLE_ASSET_POOL_TOKEN,
    ]);
  }

  get stableAssetPools(): PoolInfo[] {
    return this.pools$.value;
  }

  public subscribeAllPools(): Observable<PoolInfo[]> {
    return this.api.query.stableAsset.poolCount().pipe(
      mergeMap((res) => {
        let count: unknown = res;
        let arr = [];
        for (let i = 0; i < (count as number); i++) {
          arr.push(this.subscribePool(i));
        }
        return combineLatest(arr);
      })
    );
  }

  public subscribePool(poolId: number): Observable<PoolInfo> {
    return this.api.query.stableAsset.pools(poolId).pipe(
      map((poolInfoOption) => {
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
          aBlock: new BigNumber(poolInfo.aBlock.toString()),
          futureA: new BigNumber(poolInfo.futureA.toString()),
          futureABlock: new BigNumber(poolInfo.futureABlock.toString()),
          balances: this.convertToFixPointNumber(poolInfo.balances),
          feeRecipient: poolInfo.feeRecipient,
          accountId: poolInfo.accountId,
          precision: poolInfo.precision.toNumber(),
        };
      })
    );
  }

  private convertToFixPointNumber(a: any[]): BigNumber[] {
    let result: BigNumber[] = [];
    for (let i = 0; i < a.length; i++) {
      result.push(new BigNumber(a[i].toString()));
    }
    return result;
  }

  private getA(
    a0: BigNumber,
    t0: BigNumber,
    a1: BigNumber,
    t1: BigNumber,
    current_block: BigNumber
  ): BigNumber {
    if (current_block.comparedTo(t1) < 0) {
      let time_diff = current_block.minus(t0);
      let time_diff_div = t1.minus(t0);
      if (a1.comparedTo(a0) > 0) {
        let diff = a1.minus(a0);
        let amount = diff.times(time_diff).idiv(time_diff_div);
        return amount.plus(a0);
      } else {
        let diff = a0.minus(a1);
        let amount = diff.times(time_diff).idiv(time_diff_div);
        return a0.minus(amount);
      }
    } else {
      return a1;
    }
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
        .idiv(
          ann
            .minus(A_PRECISION)
            .times(d)
            .idiv(A_PRECISION)
            .plus(balanceLength.plus(one).times(pD))
        );
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

  private getY(
    balances: BigNumber[],
    j: number,
    d: BigNumber,
    a: BigNumber
  ): BigNumber {
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
      y = y
        .times(y)
        .plus(c)
        .idiv(y.times(new BigNumber(2)).plus(b).minus(d));
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

  private getBlockNumber(poolInfo: PoolInfo): Observable<BlockNumberWrap> {
    return this.api.rpc.chain.getHeader().pipe(
      map((value) => {
        let blockNumber = new BigNumber(value.number.toString());
        return {
          poolInfo: poolInfo,
          blockNumber: blockNumber,
        };
      })
    );
  }

  public getSwapOutAmount(
    poolId: number,
    inputIndex: number,
    outputIndex: number,
    inputAmount: FixedPointNumber,
    slippage: number,
    liquidAssetExchangeRate: FixedPointNumber
  ): Observable<SwapOutResult> {
    const blockNumberWrapObservable = this.subscribePool(poolId).pipe(
      mergeMap((poolInfo) => {
        return this.getBlockNumber(poolInfo);
      })
    );

    return blockNumberWrapObservable.pipe(
      map((blockNumberWrap) => {
        const poolInfo = blockNumberWrap.poolInfo;
        const balances: BigNumber[] = poolInfo.balances;
        const a: BigNumber = this.getA(
          poolInfo.a,
          poolInfo.aBlock,
          poolInfo.futureA,
          poolInfo.futureABlock,
          blockNumberWrap.blockNumber
        );
        const d: BigNumber = poolInfo.totalSupply;
        const inputToken = this.wallet.__getToken(poolInfo.assets[inputIndex]);
        const outputToken = this.wallet.__getToken(
          poolInfo.assets[outputIndex]
        );
        const liquidToken = this.wallet.__getToken(
          this.api.consts.homa.liquidCurrencyId
        );

        const input =
          inputToken.name === liquidToken.name
            ? inputAmount.mul(liquidAssetExchangeRate)
            : inputAmount;
        balances[inputIndex] = balances[inputIndex].plus(
          input._getInner().times(poolInfo.precisions[inputIndex])
        );
        const y: BigNumber = this.getY(balances, outputIndex, d, a);
        let dy: BigNumber = balances[outputIndex]
          .minus(y)
          .minus(new BigNumber(1))
          .idiv(poolInfo.precisions[outputIndex]);

        let fee: BigNumber = new BigNumber(0);
        if (poolInfo.swapFee.isGreaterThan(new BigNumber(0))) {
          fee = dy.times(poolInfo.swapFee).idiv(FEE_DENOMINATOR);
          dy = dy.minus(fee);
        }
        const swapParamters: SwapOutParameters = {
          poolId,
          inputIndex,
          outputIndex,
          inputToken,
          outputToken,
          inputAmount,
        };
        if (dy.isLessThan(new BigNumber(0))) {
          return new SwapOutResult(
            swapParamters,
            new FixedPointNumber(0),
            new FixedPointNumber(0),
            slippage,
            poolInfo.assets.length,
            liquidToken,
            liquidAssetExchangeRate
          );
        }

        let outputAmount = FixedPointNumber._fromBN(dy, outputToken.decimals);
        let feeAmount = FixedPointNumber._fromBN(fee, outputToken.decimals);
        if (outputToken.name === liquidToken.name) {
          outputAmount = outputAmount.div(liquidAssetExchangeRate);
          feeAmount = feeAmount.div(liquidAssetExchangeRate);
        }
        return new SwapOutResult(
          swapParamters,
          outputAmount,
          feeAmount,
          slippage,
          poolInfo.assets.length,
          liquidToken,
          liquidAssetExchangeRate
        );
      })
    );
  }

  public getSwapInAmount(
    poolId: number,
    inputIndex: number,
    outputIndex: number,
    outputAmount: FixedPointNumber,
    slippage: number,
    liquidAssetExchangeRate: FixedPointNumber
  ): Observable<SwapInResult> {
    let blockNumberWrapObservable = this.subscribePool(poolId).pipe(
      mergeMap((poolInfo) => {
        return this.getBlockNumber(poolInfo);
      })
    );

    return blockNumberWrapObservable.pipe(
      map((blockNumberWrap) => {
        const poolInfo = blockNumberWrap.poolInfo;
        const balances: BigNumber[] = poolInfo.balances;
        const a: BigNumber = this.getA(
          poolInfo.a,
          poolInfo.aBlock,
          poolInfo.futureA,
          poolInfo.futureABlock,
          blockNumberWrap.blockNumber
        );
        const d: BigNumber = poolInfo.totalSupply;
        const inputToken = this.wallet.__getToken(poolInfo.assets[inputIndex]);
        const outputToken = this.wallet.__getToken(
          poolInfo.assets[outputIndex]
        );
        const liquidToken = this.wallet.__getToken(
          this.api.consts.homa.liquidCurrencyId
        );

        const output =
          outputToken.name === liquidToken.name
            ? outputAmount.mul(liquidAssetExchangeRate)
            : outputAmount;
        let dy: BigNumber = output._getInner();
        let fee: BigNumber = new BigNumber(0);

        if (poolInfo.swapFee.isGreaterThan(new BigNumber(0))) {
          let diff = FEE_DENOMINATOR.minus(poolInfo.swapFee);
          dy = dy.times(FEE_DENOMINATOR).idiv(diff);
          fee = dy.minus(output._getInner());
        }
        balances[outputIndex] = balances[outputIndex].minus(
          dy.times(poolInfo.precisions[outputIndex])
        );
        let x: BigNumber = this.getY(balances, inputIndex, d, a);
        let dx: BigNumber = x
          .minus(balances[inputIndex])
          .minus(new BigNumber(1))
          .idiv(poolInfo.precisions[inputIndex])
          .plus(SWAP_EXACT_OVER_AMOUNT);

        let inputAmount = FixedPointNumber._fromBN(dx, inputToken.decimals);
        if (inputToken.name === liquidToken.name) {
          inputAmount = inputAmount.div(liquidAssetExchangeRate);
        }
        let feeAmount = FixedPointNumber._fromBN(fee, outputToken.decimals);

        const swapParamters: SwapInParameters = {
          poolId,
          inputIndex,
          outputIndex,
          inputToken,
          outputToken,
          outputAmount,
        };

        return new SwapInResult(
          swapParamters,
          inputAmount,
          feeAmount,
          slippage,
          poolInfo.assets.length,
          liquidToken,
          liquidAssetExchangeRate
        );
      })
    );
  }

  public getMintAmount(
    poolId: number,
    inputAmounts: FixedPointNumber[],
    slippage: number,
    liquidExchangeRate: FixedPointNumber
  ): Observable<MintResult> {
    let blockNumberWrapObservable = this.subscribePool(poolId).pipe(
      mergeMap((poolInfo) => {
        return this.getBlockNumber(poolInfo);
      })
    );

    return blockNumberWrapObservable.pipe(
      map((blockNumberWrap) => {
        const poolInfo = blockNumberWrap.poolInfo;
        const balances: BigNumber[] = poolInfo.balances;
        const a: BigNumber = this.getA(
          poolInfo.a,
          poolInfo.aBlock,
          poolInfo.futureA,
          poolInfo.futureABlock,
          blockNumberWrap.blockNumber
        );
        const oldD: BigNumber = poolInfo.totalSupply;
        const inputTokens = poolInfo.assets.map((asset) =>
          this.wallet.__getToken(asset)
        );
        const inputs: FixedPointNumber[] = [];
        const liquidToken = this.wallet.__getToken(
          this.api.consts.homa.liquidCurrencyId
        );
        for (let i = 0; i < inputTokens.length; i++) {
          inputs.push(
            inputTokens[i].name === liquidToken.name
              ? inputAmounts[i].mul(liquidExchangeRate)
              : inputAmounts[i]
          );
        }

        for (let i = 0; i < balances.length; i++) {
          if (inputs[i].isZero()) {
            continue;
          }
          // balance = balance + amount * precision
          balances[i] = balances[i].plus(
            inputs[i]._getInner().times(poolInfo.precisions[i])
          );
        }
        let newD: BigNumber = this.getD(balances, a);
        // newD should be bigger than or equal to oldD
        let output: BigNumber = newD.minus(oldD);
        let fee: BigNumber = new BigNumber(0);
        if (poolInfo.mintFee.isGreaterThan(new BigNumber(0))) {
          fee = output.times(poolInfo.mintFee).idiv(FEE_DENOMINATOR);
          output = output.minus(fee);
        }
        if (output.isLessThan(new BigNumber(0))) {
          output = new BigNumber(0);
          fee = new BigNumber(0);
        }

        const mintAmount = FixedPointNumber._fromBN(
          output,
          Math.log10(poolInfo.precision)
        );
        const feeAmount = FixedPointNumber._fromBN(
          fee,
          Math.log10(poolInfo.precision)
        );
        return new MintResult(
          {
            poolId,
            inputTokens,
            inputAmounts,
          },
          mintAmount,
          feeAmount,
          slippage,
          liquidToken,
          liquidExchangeRate
        );
      })
    );
  }

  public getRedeemSingleAmount(
    poolId: number,
    inputAmount: FixedPointNumber,
    outputIndex: number,
    slippage: number,
    liquidExchangeRate: FixedPointNumber
  ): Observable<RedeemSingleResult> {
    let blockNumberWrapObservable = this.subscribePool(poolId).pipe(
      mergeMap((poolInfo) => {
        return this.getBlockNumber(poolInfo);
      })
    );

    return blockNumberWrapObservable.pipe(
      map((blockNumberWrap) => {
        const poolInfo = blockNumberWrap.poolInfo;
        const balances: BigNumber[] = poolInfo.balances;
        const a: BigNumber = this.getA(
          poolInfo.a,
          poolInfo.aBlock,
          poolInfo.futureA,
          poolInfo.futureABlock,
          blockNumberWrap.blockNumber
        );

        const totalSupply: BigNumber = poolInfo.totalSupply;
        const feeAmount = inputAmount
          ._getInner()
          .times(poolInfo.redeemFee)
          .idiv(FEE_DENOMINATOR);
        const actualInputAmount = inputAmount._getInner().minus(feeAmount);
        const outputToken = this.wallet.__getToken(
          poolInfo.assets[outputIndex]
        );
        const liquidToken = this.wallet.__getToken(
          this.api.consts.homa.liquidCurrencyId
        );

        if (inputAmount.eq(FixedPointNumber.ZERO)) {
          return new RedeemSingleResult(
            {
              poolId,
              inputAmount,
              outputIndex,
              outputToken,
            },
            FixedPointNumber.ZERO,
            FixedPointNumber.ZERO,
            slippage,
            liquidToken,
            liquidExchangeRate,
            poolInfo.assets.length
          );
        }

        const y = this.getY(
          balances,
          outputIndex,
          totalSupply.minus(actualInputAmount),
          a
        );
        const dy = balances[outputIndex].minus(y).minus(1).idiv(poolInfo.precisions[outputIndex]);
        let outputAmount = FixedPointNumber._fromBN(dy, outputToken.decimals);
        if (outputToken.name === liquidToken.name) {
          outputAmount = outputAmount.div(liquidExchangeRate);
        }

        return new RedeemSingleResult(
          {
            poolId,
            inputAmount,
            outputIndex,
            outputToken,
          },
          outputAmount,
          FixedPointNumber._fromBN(feeAmount, poolInfo.precision),
          slippage,
          liquidToken,
          liquidExchangeRate,
          poolInfo.assets.length
        );
      })
    );
  }

  public getRedeemProportionAmount(
    poolId: number,
    inputAmount: FixedPointNumber,
    slippage: number,
    liquidExchangeRate: FixedPointNumber
  ): Observable<RedeemProportionResult> {
    return this.subscribePool(poolId).pipe(
      map((poolInfo) => {
        const balances: BigNumber[] = poolInfo.balances;
        const totalSupply: BigNumber = poolInfo.totalSupply;
        const feeAmount = inputAmount
          ._getInner()
          .times(poolInfo.redeemFee)
          .idiv(FEE_DENOMINATOR);
        const actualInputAmount = inputAmount._getInner().minus(feeAmount);
        const outputTokens = poolInfo.assets.map((asset) =>
          this.wallet.__getToken(asset)
        );
        const liquidToken = this.wallet.__getToken(
          this.api.consts.homa.liquidCurrencyId
        );

        let outputAmounts: FixedPointNumber[] = [];
        for (let i = 0; i < balances.length; i++) {
          const output = balances[i]
            .multipliedBy(actualInputAmount)
            .idiv(totalSupply)
            .idiv(poolInfo.precisions[i]);
          let outputAmount = FixedPointNumber._fromBN(
            output,
            outputTokens[i].decimal
          );
          if (outputTokens[i].name === liquidToken.name) {
            outputAmount = outputAmount.div(liquidExchangeRate);
          }
          outputAmounts.push(outputAmount);
        }

        return new RedeemProportionResult(
          {
            poolId,
            inputAmount,
            outputTokens,
          },
          outputAmounts,
          FixedPointNumber._fromBN(feeAmount, poolInfo.precision),
          slippage,
          liquidToken,
          liquidExchangeRate
        );
      })
    );
  }
}
