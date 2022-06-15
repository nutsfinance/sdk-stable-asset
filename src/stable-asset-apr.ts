import { FixedPointNumber } from '@acala-network/sdk-core';
import fetch from 'axios';

export const getPoolAPR = async (network: string, poolId: number) => {
    const query = `https://api.taigaprotocol.io/rewards/apr?network=${network}&pool=${poolId}`;
    const result = await fetch(query);
    if (result.status != 200) {
      return {};
    }

    return result.data;
  }

  export const getUserRewards = async (user: string) => {
    const query = `https://api.taigaprotocol.io/rewards/user/${user}`;
    const result = await fetch(query);
    if (result.status != 200) {
      return [];
    }

    return result.data;
  }

  const main = async () => {
      const apr = await getPoolAPR('karura', 0);
      console.log(apr)
      const rewards = await getUserRewards('5FLatVBwAAfjX7yKt2d1TGZWJFxNC9yAnRzxxyQbQQeRg6My');
      console.log(rewards)
  }

  main()