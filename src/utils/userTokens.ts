export type OwnedTokenDetailed = {
  address: string;
  balance: string;
  usd: number;
};

export const fetchSolPrice = async (): Promise<number> => {
  try {
    const response = await fetch("https://api.solscan.io/market?symbol=SOL");
    const json = await response.json();
    return json.data.priceUsdt;
  } catch (error) {
    console.error(error);
    return 0;
  }
};

// TODO: use web3 library
export const getUserTokens = async (
  pk?: string
): Promise<OwnedTokenDetailed[]> => {
  let data: OwnedTokenDetailed[] = [];

  // for testing
  // pk = "CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq"

  try {
    if (pk) {
      let tokens = await (
        await fetch(
          `https://api.solscan.io/account/tokens?address=${pk}&price=1`
        )
      ).json();
      data = tokens.data.map((token: any) => {
        return {
          address: token.tokenAddress,
          balance: token.tokenAmount.uiAmountString,
          usd: +(token.tokenAmount.uiAmount * (token.priceUsdt ?? 0)).toFixed(
            4
          ),
        };
      });
    }
  } catch (error) {
    console.error(error);
  }

  return data.filter((t: OwnedTokenDetailed) => +t.balance > 0);
};
