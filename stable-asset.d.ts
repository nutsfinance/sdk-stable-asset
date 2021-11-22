import { Observable } from 'rxjs';
import { CurrencyId, AccountId } from '@acala-network/types/interfaces';
import { ApiRx } from '@polkadot/api';
import { FixedPointNumber } from '@acala-network/sdk-core/fixed-point-number';
export interface PoolInfo {
    poolAsset: CurrencyId;
    assets: CurrencyId[];
    precisions: FixedPointNumber[];
    mintFee: FixedPointNumber;
    swapFee: FixedPointNumber;
    redeemFee: FixedPointNumber;
    totalSupply: FixedPointNumber;
    a: FixedPointNumber;
    balances: FixedPointNumber[];
    feeRecipient: AccountId;
}
export interface SwapResult {
    outputAmount: FixedPointNumber;
    feeAmount: FixedPointNumber;
}
export interface MintResult {
    outputAmount: FixedPointNumber;
    feeAmount: FixedPointNumber;
}
export declare class StableAssetRx {
    private api;
    constructor(api: ApiRx);
    getAvailablePools(): Observable<PoolInfo[]>;
    getPoolInfo(poolId: number): Observable<PoolInfo>;
    private getD;
    private getY;
    getSwapAmount(poolId: number, input: number, output: number, inputAmount: FixedPointNumber): Observable<SwapResult>;
    swap(poolId: number, input: number, output: number, inputAmount: FixedPointNumber, minOutput: FixedPointNumber): import("@polkadot/api/types").SubmittableExtrinsic<"rxjs", import("@polkadot/types/types").ISubmittableResult>;
    getMintAmount(poolId: number, inputAmounts: FixedPointNumber[]): Observable<MintResult>;
    mint(poolId: number, inputAmounts: FixedPointNumber[], minMintAmount: FixedPointNumber): import("@polkadot/api/types").SubmittableExtrinsic<"rxjs", import("@polkadot/types/types").ISubmittableResult>;
}
