import { PublicKey } from "@solana/web3.js";
import { TokenListContainer } from "@solana/spl-token-registry";
import { Provider } from "@project-serum/anchor";
import { Swap as SwapClient } from "@project-serum/swap";
import { SwapContextProvider } from "./context/Swap";
import { DexContextProvider } from "./context/Dex";
import { MintContextProvider } from "./context/Mint";
import { TokenListContextProvider } from "./context/TokenList";
import { TokenContextProvider } from "./context/Token";
import SwapCard from "./components/Swap";

// The swap module exports a single `Swap` component that can be embedded into
// applications.
export default function Swap({
  style,
  provider,
  tokenList,
  fromMint,
  toMint,
  fromAmount,
  toAmount,
}: {
  provider: Provider;
  tokenList: TokenListContainer;
  fromMint?: PublicKey;
  toMint?: PublicKey;
  fromAmount?: number;
  toAmount?: number;
  style?: any;
}) {
  const swapClient = new SwapClient(provider, tokenList);
  return (
    <TokenListContextProvider tokenList={tokenList}>
      <MintContextProvider provider={provider}>
        <TokenContextProvider provider={provider}>
          <DexContextProvider swapClient={swapClient}>
            <SwapContextProvider
              fromMint={fromMint}
              toMint={toMint}
              fromAmount={fromAmount}
              toAmount={toAmount}
            >
              <SwapCard style={style} />
            </SwapContextProvider>
          </DexContextProvider>
        </TokenContextProvider>
      </MintContextProvider>
    </TokenListContextProvider>
  );
}
