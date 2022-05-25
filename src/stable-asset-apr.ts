import { FixedPointNumber } from '@acala-network/sdk-core';
import fetch from 'axios';

interface PoolDailyData {
    yieldVolume: number,
    feeVolume: number,
    totalSupply: number,
    timestamp: string
}

export const getPoolAPR = async (network: string, poolId: number) => {
    const query = `https://api.subquery.network/sq/nutsfinance/stable-asset-${network}?`
    + `query={dailyData(first:30, orderBy: TIMESTAMP_DESC, filter: {poolId: {equalTo: ${poolId}}}) {nodes{yieldVolume feeVolume totalSupply}}}`;
    const result = await fetch(query);
    if (result.status != 200) {
      return FixedPointNumber.ZERO;
    }
    console.log(result.data)

    const data = result.data.data.dailyData.nodes;
    const dailyAPR = data.map((dailyData: PoolDailyData) => (dailyData.yieldVolume + dailyData.feeVolume) * 365 / dailyData.totalSupply);

    return new FixedPointNumber(dailyAPR.reduce((sum: number, current: number) => sum + current) / data.length);
  }

  export const getTaiKsmIncentiveAPR = async (dailyRewardAmount: FixedPointNumber) => {
    const query1 = "https://api.subquery.network/sq/nutsfinance/stable-asset-karura?"
    + "query={dailyData(first:30, orderBy: TIMESTAMP_DESC, filter: {poolId: {equalTo: 0}}) {nodes{totalSupply}}}";
    const result1 = await fetch(query1);
    if (result1.status != 200) {
      return FixedPointNumber.ZERO;
    }
    const dailyTotalSupply = result1.data.data.dailyData.nodes.map((node: {totalSupply: string}) => node.totalSupply);

    const query2 = "https://api.subquery.network/sq/AcalaNetwork/karura-dex?"
    + `query={token(id:"TAI"){dailyData(first:30, orderBy: TIMESTAMP_DESC){nodes{price}}}}`;
    const result2 = await fetch(query2);
    if (result2.status != 200) {
      return FixedPointNumber.ZERO;
    }
    const dailyTaiPrice = result2.data.data.token.dailyData.nodes.map((node: {price: string}) => node.price);

    const query3 = "https://api.subquery.network/sq/AcalaNetwork/karura-dex?"
    + `query={token(id:"sa://0"){dailyData(first:30, orderBy: TIMESTAMP_DESC){nodes{price}}}}`;
    const result3 = await fetch(query3);
    if (result3.status != 200) {
      return FixedPointNumber.ZERO;
    }
    const dailyTaiKsmPrice = result3.data.data.token.dailyData.nodes.map((node: {price: string}) => node.price);

    let totalAPR = FixedPointNumber.ZERO;
    for (let i = 0; i < dailyTotalSupply.length; i++) {
      const taiValue = dailyRewardAmount.mul(FixedPointNumber.fromInner(dailyTaiPrice[i], 18));
      const taiKsmValue = new FixedPointNumber(dailyTotalSupply[i]).mul(FixedPointNumber.fromInner(dailyTaiKsmPrice[i], 18));
      const apr = taiValue.mul(new FixedPointNumber("365")).div(taiKsmValue);

      totalAPR = totalAPR.add(apr);
    }
    return totalAPR.div(new FixedPointNumber(dailyTotalSupply.length));
  }

  const main = async () => {
      const apr = await getPoolAPR('karura', 0);
      console.log(apr.toNumber())
      const incentive = await getTaiKsmIncentiveAPR(new FixedPointNumber(4000));
      console.log(incentive.toNumber())
  }

  main()