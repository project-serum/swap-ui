import * as assert from "assert";
import React, { useContext, useState } from "react";
import { useAsync } from "react-async-hook";
import { PublicKey } from "@solana/web3.js";
import {
  Token,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Market } from "@project-serum/serum";
import { SRM_MINT, USDC_MINT, USDT_MINT } from "../utils/pubkeys";
import { useFairRoute, useRouteVerbose, useDexContext } from "./Dex";
import {
  useTokenListContext,
  SPL_REGISTRY_SOLLET_TAG,
  SPL_REGISTRY_WORM_TAG,
} from "./TokenList";

const DEFAULT_SLIPPAGE_PERCENT = 0.5;

export type SwapContext = {
  // Mint being traded from. The user must own these tokens.
  fromMint: PublicKey;
  setFromMint: (m: PublicKey) => void;

  // Mint being traded to. The user will receive these tokens after the swap.
  toMint: PublicKey;
  setToMint: (m: PublicKey) => void;

  // Amount used for the swap.
  fromAmount: number;
  setFromAmount: (a: number) => void;

  // *Expected* amount received from the swap.
  toAmount: number;
  setToAmount: (a: number) => void;

  // Function to flip what we consider to be the "to" and "from" mints.
  swapToFromMints: () => void;

  // The amount (in units of percent) a swap can be off from the estimate
  // shown to the user.
  slippage: number;
  setSlippage: (n: number) => void;

  // Null if the user is using fairs directly from DEX prices.
  // Otherwise, a user specified override for the price to use when calculating
  // swap amounts.
  fairOverride: number | null;
  setFairOverride: (n: number | null) => void;

  // The referral *owner* address. Associated token accounts must be created,
  // first, for this to be used.
  referral?: PublicKey;

  // True if all newly created market accounts should be closed in the
  // same user flow (ideally in the same transaction).
  isClosingNewAccounts: boolean;
  setIsClosingNewAccounts: (b: boolean) => void;
};
const _SwapContext = React.createContext<null | SwapContext>(null);

export function SwapContextProvider(props: any) {
  const [fromMint, setFromMint] = useState(props.fromMint ?? SRM_MINT);
  const [toMint, setToMint] = useState(props.toMint ?? USDC_MINT);
  const [fromAmount, _setFromAmount] = useState(props.fromAmount ?? 0);
  const [toAmount, _setToAmount] = useState(props.toAmount ?? 0);
  const [isClosingNewAccounts, setIsClosingNewAccounts] = useState(false);
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE_PERCENT);
  const [fairOverride, setFairOverride] = useState<number | null>(null);
  const fair = _useSwapFair(fromMint, toMint, fairOverride);
  const referral = props.referral;

  assert.ok(slippage >= 0);

  const swapToFromMints = () => {
    const oldFrom = fromMint;
    const oldFromAmount = fromAmount;
    const oldTo = toMint;
    const oldToAmount = toAmount;
    setFromMint(oldTo);
    setToMint(oldFrom);
    _setFromAmount(oldToAmount);
    _setToAmount(oldFromAmount);
  };

  const setFromAmount = (amount: number) => {
    if (fair === undefined) {
      throw new Error("Fair price not found");
    }
    _setFromAmount(amount);
    _setToAmount(amount / fair);
  };

  const setToAmount = (amount: number) => {
    if (fair === undefined) {
      throw new Error("Fair price not found");
    }
    _setToAmount(amount);
    _setFromAmount(amount * fair);
  };

  return (
    <_SwapContext.Provider
      value={{
        fromMint,
        setFromMint,
        toMint,
        setToMint,
        fromAmount,
        setFromAmount,
        toAmount,
        setToAmount,
        swapToFromMints,
        slippage,
        setSlippage,
        fairOverride,
        setFairOverride,
        isClosingNewAccounts,
        setIsClosingNewAccounts,
        referral,
      }}
    >
      {props.children}
    </_SwapContext.Provider>
  );
}

export function useSwapContext(): SwapContext {
  const ctx = useContext(_SwapContext);
  if (ctx === null) {
    throw new Error("Context not available");
  }
  return ctx;
}

export function useSwapFair(): number | undefined {
  const { fairOverride, fromMint, toMint } = useSwapContext();
  return _useSwapFair(fromMint, toMint, fairOverride);
}

function _useSwapFair(
  fromMint: PublicKey,
  toMint: PublicKey,
  fairOverride: number | null
): number | undefined {
  const fairRoute = useFairRoute(fromMint, toMint);
  const fair = fairOverride === null ? fairRoute : fairOverride;
  return fair;
}

// Returns true if the user can swap with the current context.
export function useCanSwap(): boolean {
  const { fromMint, toMint, fromAmount, toAmount } = useSwapContext();
  const { swapClient } = useDexContext();
  const { wormholeMap, solletMap } = useTokenListContext();
  const route = useRouteVerbose(fromMint, toMint);
  if (route === null) {
    return false;
  }

  return (
    // Mints are distinct.
    fromMint.equals(toMint) === false &&
    // Wallet is connected.
    swapClient.program.provider.wallet.publicKey !== null &&
    // Trade amounts greater than zero.
    fromAmount > 0 &&
    toAmount > 0 &&
    // Trade route exists.
    route !== null &&
    // Wormhole <-> native markets must have the wormhole token as the
    // *from* address since they're one-sided markets.
    (route.kind !== "wormhole-native" ||
      wormholeMap
        .get(fromMint.toString())
        ?.tags?.includes(SPL_REGISTRY_WORM_TAG) !== undefined) &&
    // Wormhole <-> sollet markets must have the sollet token as the
    // *from* address since they're one sided markets.
    (route.kind !== "wormhole-sollet" ||
      solletMap
        .get(fromMint.toString())
        ?.tags?.includes(SPL_REGISTRY_SOLLET_TAG) !== undefined)
  );
}

export function useReferral(fromMarket?: Market): PublicKey | undefined {
  const { referral } = useSwapContext();
  const asyncReferral = useAsync(async () => {
    if (!referral) {
      return undefined;
    }
    if (!fromMarket) {
      return undefined;
    }
    if (
      !fromMarket.quoteMintAddress.equals(USDC_MINT) &&
      !fromMarket.quoteMintAddress.equals(USDT_MINT)
    ) {
      return undefined;
    }

    return Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      fromMarket.quoteMintAddress,
      referral
    );
  }, [fromMarket]);

  if (!asyncReferral.result) {
    return undefined;
  }
  return asyncReferral.result;
}
