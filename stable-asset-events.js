const { ApiPromise, WsProvider } = require('@polkadot/api');
async function main () {
  const provider = new WsProvider('wss://node-6874894268421574656.jm.onfinality.io/ws?apikey=2407fcb5-3dd5-4301-bd5c-46a917b18bfa');
  const api = await ApiPromise.create({provider: provider});
  const currentBlock = await api.rpc.chain.getBlock();
  let currentBlockNumber = currentBlock.block.header.number.toNumber();
  let startBlockNumber = 330125;

  let promises = []
  for (let i = startBlockNumber; i < currentBlockNumber - 10; i++) {
    let eventsInBlock = getBlockEvents(api, i);
    promises.push(eventsInBlock);
    if (promises.length >= 1000) {
      let values = await Promise.all(promises);
      values.flat().forEach(event => {
        console.log(JSON.stringify(event));
      });
      promises = [];
    }
  }
  if (promises.length > 0) {
    let values = await Promise.all(promises);
    values.flat().forEach(event => {
      console.log(JSON.stringify(event));
    });
  }
  console.log("done");
}

async function getBlockEvents(api, blockNumber) {
  const hash = await api.rpc.chain.getBlockHash(blockNumber);
  const signedBlock = await api.rpc.chain.getBlock(hash);
  const allRecords = await api.query.system.events.at(hash);
  const allEvents = signedBlock.block.extrinsics.map(({ method: { method, section } }, index) => {
    const events = allRecords
      .filter(({ phase }) =>
        phase.isApplyExtrinsic &&
        phase.asApplyExtrinsic.eq(index)
      )
      .filter(({ event }) => event.section == 'stableAsset')
      .map(({ event }) => {
        let eventData = JSON.parse(event.toString());
        eventData['name'] = event.meta.name.toString();
        eventData['block_hash'] = hash.toString();
        return eventData;
      });
      return events;
  });
  return allEvents.flat();
}
main();
