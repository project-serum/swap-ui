import {
  SwapContextProvider,
  useSwapContext,
  useSwapFair,
  useCanSwap,
  useReferral,
} from "./context/Swap";
import {
  DexContextProvider,
  useDexContext,
  useOpenOrders,
  useFairRoute,
  useRouteVerbose,
  useMarketName,
  useMarket,
  useBbo,
  FEE_MULTIPLIER,
} from "./context/Dex";
import {
  TokenListContextProvider,
  useSwappableTokens,
  useTokenMap,
} from "./context/TokenList";
import {
  TokenContextProvider,
  useOwnedTokenAccount,
  useMint,
} from "./context/Token";
import SwapCard, {
  ArrowButton,
  SwapButton,
  SwapHeader,
  SwapTokenForm,
} from "./components/Swap";
import TokenDialog from "./components/TokenDialog";
import Swap from "./Swap";
import { SOL_MINT, WRAPPED_SOL_MINT } from "./utils/pubkeys";

export default Swap;

export {
  // Components.
  Swap,
  SwapCard,
  SwapHeader,
  SwapTokenForm,
  ArrowButton,
  SwapButton,
  TokenDialog,
  // Providers and context.
  // Swap.
  SwapContextProvider,
  useSwapContext,
  useSwapFair,
  useCanSwap,
  useReferral,
  // TokenList.
  TokenListContextProvider,
  useTokenMap,
  useSwappableTokens,
  // Token.
  TokenContextProvider,
  useOwnedTokenAccount,
  useMint,
  // Dex.
  DexContextProvider,
  useDexContext,
  useOpenOrders,
  useFairRoute,
  useRouteVerbose,
  useMarketName,
  useMarket,
  useBbo,
  FEE_MULTIPLIER,
  // Utils
  SOL_MINT,
  WRAPPED_SOL_MINT,
};
