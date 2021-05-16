import { useAsync, UseAsyncReturn } from "react-async-hook";
import { Connection, PublicKey } from "@solana/web3.js";

// Token info tracked by the sollet bridge.
type SolletInfo = {
  blockchain: string;
  erc20Contract: string;
  name: string;
  splMint: PublicKey;
  ticker: string;
};

export function useSolletInfo(mint: PublicKey): UseAsyncReturn<SolletInfo> {
  return useAsync(async () => {
    return fetchSolletInfo(mint);
  }, [mint]);
}

// Fetches the token info from the sollet bridge.
export async function fetchSolletInfo(mint: PublicKey): Promise<SolletInfo> {
  let info = _SOLLET_INFO_CACHE.get(mint.toString());
  if (info !== undefined) {
    return info;
  }

  const infoRaw = await swapApiRequest("GET", `coins/sol/${mint.toString()}`);
  info = { ...infoRaw, splMint: new PublicKey(infoRaw.splMint) };
  _SOLLET_INFO_CACHE.set(mint.toString(), info!);

  return info!;
}

// Requests the creation of a sollet wormhole swap market, if it doesn't
// already exist. Note: this triggers a creation notification. Creation
// doesn't happen immediately, but at some unspecified point in the future
// since market makers need to setup on the swap market and provide liquidity.
//
// Returns true if the market exists already. False otherwise.
export async function requestWormholeSwapMarketIfNeeded(
  connection: Connection,
  solletMint: PublicKey,
  wormholeMint: PublicKey,
  swapMarket: PublicKey,
  solletInfo: SolletInfo
): Promise<boolean> {
  const cached = _SWAP_MARKET_EXISTS_CACHE.get(swapMarket.toString());
  if (cached !== undefined) {
    return cached;
  }
  const acc = await connection.getAccountInfo(swapMarket);
  if (acc === null) {
    _SWAP_MARKET_EXISTS_CACHE.set(swapMarket.toString(), false);
    const resource = `wormhole/pool/${
      solletInfo.ticker
    }/${swapMarket.toString()}/${solletMint.toString()}/${wormholeMint.toString()}`;
    swapApiRequest("POST", resource).catch(console.error);
    return false;
  } else {
    _SWAP_MARKET_EXISTS_CACHE.set(swapMarket.toString(), true);
    return true;
  }
}

export async function swapApiRequest(
  method: string,
  path: string,
  body?: Object
) {
  let headers: any = {};
  let params: any = { headers, method };
  if (method === "GET") {
    params.cache = "no-cache";
  } else if (body) {
    headers["Content-Type"] = "application/json";
    params.body = JSON.stringify(body);
  }
  let resp = await fetch(`https://swap.sollet.io/api/${path}`, params);
  return await handleSwapApiResponse(resp);
}

async function handleSwapApiResponse(resp: Response) {
  let json = await resp.json();
  if (!json.success) {
    throw new SwapApiError(json.error, resp.status);
  }
  return json.result;
}

export class SwapApiError extends Error {
  readonly name: string;
  readonly status: number;
  constructor(msg: string, status: number) {
    super(msg);
    this.name = "SwapApiError";
    this.status = status;
  }
}

const _SOLLET_INFO_CACHE = new Map<string, SolletInfo>();
const _SWAP_MARKET_EXISTS_CACHE = new Map<string, boolean>();
