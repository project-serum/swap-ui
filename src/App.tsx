import React, { useState, useEffect } from "react";
import { Typography } from "@material-ui/core";
import { Provider } from "@project-serum/anchor";
// @ts-ignore
import Wallet from "@project-serum/sol-wallet-adapter";
import { ConfirmOptions, Connection } from "@solana/web3.js";
import { TokenListProvider } from "@solana/spl-token-registry";
import Swap from "./components/Swap";
import "./App.css";

function App() {
  const [params, setParams] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Create the provider and token list.
  useEffect(() => {
    const opts: ConfirmOptions = {
      preflightCommitment: "recent",
      commitment: "recent",
    };
    const network = "https://api.mainnet-beta.solana.com";
    const wallet = new Wallet("https://www.sollet.io", network);
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(connection, wallet, opts);
    new TokenListProvider().resolve().then((tokenList) => {
      setParams({
        provider,
        tokenList,
      });
      wallet.connect();
    });
  }, [setParams]);

  // Connect to the wallet.
  useEffect(() => {
    if (params !== null) {
      params.provider.wallet.on("connect", () => {
        setIsConnected(true);
      });
      params.provider.wallet.connect();
    }
  }, [params]);

  return (
    <div
      style={{
        width: "450px",
        marginLeft: "auto",
        marginRight: "auto",
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      {isConnected ? (
        <Swap provider={params.provider} tokenList={params.tokenList} />
      ) : (
        <Typography style={{ textAlign: "center" }}>Disconnected</Typography>
      )}
    </div>
  );
}

export default App;
