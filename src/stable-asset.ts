
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { assert } from '@polkadot/util';
import { FixedPointNumber, forceToCurrencyId, MaybeCurrency, Token } from '@acala-network/sdk-core';
import { CurrencyId, Position, AccountId } from '@acala-network/types/interfaces';
import { DerivedLoanType } from '@acala-network/api-derive';
import { ApiRx } from '@polkadot/api';
import { memoize } from 'lodash';

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
    delta: FixedPointNumber,
    balance: FixedPointNumber
}

export class StableAssetRx {
    private api: ApiRx;
    private poolInfos$: BehaviorSubject<PoolInfo[]>;

    constructor(api: ApiRx) {
        this.api = api;
        this.poolInfos$ = new BehaviorSubject<PoolInfo[]>([]);
    }

    get availablePools(): Observable<PoolInfo[]> {
        return this.poolInfos$;
    }

    // Return observable of current stable asset pools
    // E.g. https://github.com/AcalaNetwork/acala.js/blob/master/packages/sdk-swap/src/swap-rx.ts#L42
    private getAvailablePools(): Observable<PoolInfo[]> {

    }
    
    public getSwapAmount(poolAsset: CurrencyId, input: FixedPointNumber, output: FixedPointNumber, inputAmount: FixedPointNumber): SwapResult {

    }
}