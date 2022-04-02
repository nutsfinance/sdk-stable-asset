import { cryptoWaitReady } from "@polkadot/util-crypto";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic, SubmittableResultSubscription } from '@polkadot/api/types';
import { EventRecord, Hash } from '@polkadot/types/interfaces';
import { SignatureOptions } from '@polkadot/types/types';
import * as fs from 'fs';
const config = {
  ws: 'wss://karura-rpc-0.aca-api.network',
  seed: '//Bob',
};

const readFile = async() => {
  const data = fs.readFileSync('./test.csv', {encoding:'utf8', flag:'r'});
  let transfer_data: Array<Array<any>> = [];
  for (let line of data.split("\n")) {
    if (line) {
      let [address, amount] = line.split(",");
      let amount_bigint = BigInt(amount + "000000000000");
      transfer_data.push([address, amount_bigint]);
    }
  }
  await main(transfer_data);
}

const main = async (data: Array<Array<any>>) => {
  const ws = new WsProvider(config.ws);
  const api = new ApiPromise({ provider: ws });
  await api.isReady;

  await cryptoWaitReady()

  const keyring = new Keyring({ type: 'sr25519' })
  const pair = keyring.addFromUri(config.seed)

  let batchTx = [] as SubmittableExtrinsic<'promise'>[]

  const sendBatchTx = async () => {
    const tx = batchTx
    batchTx = []
    const finalTx = api.tx.utility.batchAll(tx)
    const val = await (await sendTx(finalTx, pair)).inBlock
  }

  const addBatchTx = async (tx: SubmittableExtrinsic<'promise'>, send = true) => {
    const batchSize = 400
    batchTx.push(tx)
    if (send && batchTx.length >= batchSize) {
      await sendBatchTx()
    }
  }

  for (const vest of data) {
    const [acc, val] = vest as [string, any]
    const tx = api.tx.currencies.transfer(acc, { token: 'TAI'}, val)
    await addBatchTx(tx)
  }

  await sendBatchTx()
};

readFile()
  .catch((err) => {
    console.error("Error:", Object.entries(err), err);
  })
  .finally(() => {
    process.exit();
  });

function deferred<T>() {
  const deferred: { promise: Promise<T>, resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void } = {} as any
  deferred.promise = new Promise<T>((resolve, reject) => {
      deferred.resolve = resolve
      deferred.reject = reject
  })
  return deferred
}

const log = (...x: any[]) => {
  const item = x.length === 1 ? x[0] : x
  const json = logFormat(item)
  console.dir(json, { depth: 7, maxArrayLength: null })
}

const logFormat: any = (x: any) => {
  if (x == null) {
      return x
  }
  if (x.toHuman) {
      return x.toHuman()
  }
  if (Array.isArray(x)) {
      return x.map(logFormat)
  }
  return x
}
const sendTx = async (tx: SubmittableExtrinsic<'promise'>, pair: KeyringPair, options?: Partial<SignatureOptions>) => {
  let send: SubmittableResultSubscription<'promise'>
  const finalized = deferred<{ events: EventRecord[], blockHash: Hash, txHash: Hash }>()
  const inBlock = deferred<{ events: EventRecord[], blockHash: Hash, txHash: Hash }>()
      const signed = await tx.signAsync(pair, options || {});
      log('sendTx', {
          from: pair.address.toString(),
          nonce: signed.nonce.toJSON(),
          method: `${signed.method.section}.${signed.method.method}`,
          args: tx.args.map(x => x.toHuman()).join(', '),
          hash: signed.hash.toString(),
      })
      send = signed.send(res => {
          log({
              hash: signed.hash.toHex(),
              status: res.status.toHuman(),
          })
          if (res.isInBlock) {
              inBlock.resolve({ events: res.events, blockHash: res.status.asInBlock, txHash: signed.hash })
          } else if (res.isFinalized) {
              finalized.resolve({ events: res.events, blockHash: res.status.asFinalized, txHash: signed.hash })
          } else if (res.isError) {
              // inBlock.reject(res.status.toJSON())
              // finalized.reject(res.status.toJSON())
          }

      })
      send.catch(inBlock.reject)
      send.catch(finalized.reject)

  inBlock
  .promise
  .then(({ blockHash, txHash }) => {
      log('confirmed', {
          blockHash: blockHash.toJSON(),
          txHash: txHash.toJSON(),
      })
  })

  finalized
  .promise
  .finally(async () => {
      let unsup = await send
      unsup()
  })
  return {
      finalized: finalized.promise,
      inBlock: inBlock.promise,
      send,
  }
}
