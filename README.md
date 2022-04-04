# @tree-protocol/sdk-stable-asset

## Batch Transfer
1. Create a test.csv in the current folder, the format will be:
```csv
tEb1xUcts6LghHUrG2KeygtxQJtF8AeznxMVBmJHF2LBeuz,1
```
2. Change the script to put your seed (`//Bob` below):
```
const config = {
  ws: 'wss://karura-rpc-0.aca-api.network',
  seed: '//Bob',
};
```
3. Run the following:
```
npm ci
npm install -g ts-node
ts-node src/batch-transfer.ts
```
