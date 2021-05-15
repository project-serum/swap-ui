import { useState, useEffect } from "react";
import { SnackbarProvider, useSnackbar } from "notistack";
import { Button, Typography } from "@material-ui/core";
import { Provider } from "@project-serum/anchor";
// @ts-ignore
import Wallet from "@project-serum/sol-wallet-adapter";
import {
  Account,
  ConfirmOptions,
  Connection,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import { TokenListProvider } from "@solana/spl-token-registry";
import Swap from "./components/Swap";
import "./App.css";

// App illustrating the use of the Swap component.
//
// One needs to just provide an Anchor `Provider` and a `TokenListContainer`
// to the `Swap` component, and then everything else is taken care of.
function App() {
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
      <SnackbarProvider maxSnack={5} autoHideDuration={8000}>
        <AppInner />
      </SnackbarProvider>
    </div>
  );
}

function AppInner() {
  const { enqueueSnackbar } = useSnackbar();
  const [params, setParams] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Create the provider and token list.
  useEffect(() => {
    const opts: ConfirmOptions = {
      preflightCommitment: "recent",
      commitment: "recent",
    };
    const network = "https://solana-api.projectserum.com";
    const wallet = new Wallet("https://www.sollet.io", network);
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new NotifyingProvider(connection, wallet, opts, (tx) => {
      enqueueSnackbar("Transaction sent", {
        variant: "success",
        action: (
          <Button
            color="inherit"
            component="a"
            target="_blank"
            rel="noopener"
            href={`https://explorer.solana.com/tx/${tx}`}
          >
            View on Solana Explorer
          </Button>
        ),
      });
    });
    new TokenListProvider().resolve().then((tokenList) => {
      setParams({
        provider,
        tokenList,
      });
      wallet.connect();
    });
  }, [enqueueSnackbar, setParams]);

  // Connect to the wallet.
  useEffect(() => {
    if (params !== null) {
      params.provider.wallet.on("connect", () => {
        setIsConnected(true);
      });
      params.provider.wallet.connect();
    }
  }, [params]);

  return isConnected ? (
    <Swap provider={params.provider} tokenList={params.tokenList} />
  ) : (
    <Typography style={{ textAlign: "center" }}>Disconnected</Typography>
  );
}

// Custom provider to display notifications whenever a transaction is sent.
//
// Note that this is an Anchor wallet/network provider--not a React provider,
// so all transactions will be flowing through here, which allows us to
// hook in to display all transactions sent from the `Swap` component
// as notifications in the parent app.
class NotifyingProvider extends Provider {
  // Function to call whenever the provider sends a transaction;
  private onTransaction: (tx: TransactionSignature) => void;

  constructor(
    connection: Connection,
    wallet: Wallet,
    opts: ConfirmOptions,
    onTransaction: (tx: TransactionSignature) => void
  ) {
    super(connection, wallet, opts);
    this.onTransaction = onTransaction;
  }

  async send(
    tx: Transaction,
    signers?: Array<Account | undefined>,
    opts?: ConfirmOptions
  ): Promise<TransactionSignature> {
    // A production implementation should handle error notifications as well.
    const txSig = await super.send(tx, signers, opts);
    this.onTransaction(txSig);
    return txSig;
  }
}

export default App;
