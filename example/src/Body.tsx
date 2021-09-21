import { ConnectWalletButton } from "@gokiprotocol/walletkit";
import { useConnectedWallet, useSolana } from "@saberhq/use-solana";
import {
  ConfirmOptions,
  Transaction,
  PublicKey,
  TransactionSignature,
  Connection,
  Signer,
} from "@solana/web3.js";
import { useEffect, useState } from "react";
import { Button, Grid, makeStyles } from "@material-ui/core";
import { useSnackbar } from "notistack";

import { Swap } from "@project-serum/swap-ui";
import {
  TokenListContainer,
  TokenListProvider,
} from "@solana/spl-token-registry";
import * as anchor from "@project-serum/anchor";
import Wallet from "@project-serum/sol-wallet-adapter";

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "100vh",
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
}));

export const Body: React.FC = () => {
  const styles = useStyles();
  const opts: ConfirmOptions = {
    preflightCommitment: "recent",
  };

  const { disconnect } = useSolana();
  const wallet = useConnectedWallet();
  const { enqueueSnackbar } = useSnackbar();
  const network = "https://solana-api.projectserum.com";
  // const network = "https://api.devnet.solana.com";

  let initWallet = new Wallet("https://www.sollet.io", network);
  let passedWallet = wallet == null ? initWallet : wallet;

  const connection = new anchor.web3.Connection(
    network,
    opts.preflightCommitment
  );
  const initialTokenList = new TokenListContainer([
    {
      chainId: 1,
      address: "string",
      name: "wallet",
      decimals: 2,
      symbol: "NAMEE",
    },
  ]);

  const [tokenList, setTokenList] =
    useState<TokenListContainer>(initialTokenList);

  const newProvider = new NotifyingProvider(
    connection,
    passedWallet as Wallet,
    opts,
    (tx, err) => {
      if (err) {
        enqueueSnackbar(`Error: ${err.toString()}`, {
          variant: "error",
          autoHideDuration: 5000,
        });
      } else {
        enqueueSnackbar("Transaction sent", {
          variant: "success",
          autoHideDuration: 8000,
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
      }
    }
  );

  useEffect(() => {
    new TokenListProvider().resolve().then(setTokenList);
  }, [setTokenList]);

  useEffect(() => {
    wallet?.on("disconnect", () => {
      enqueueSnackbar("Wallet Disconnected", { variant: "info" });
    });
    if (wallet?.publicKey) {
      enqueueSnackbar("Wallet Connected", { variant: "success" });
    }
  }, [wallet, enqueueSnackbar]);

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      className={styles.root}
    >
      {!wallet ? (
        <ConnectWalletButton
          style={{ position: "fixed", right: 24, top: 24 }}
        />
      ) : (
        <Button
          onClick={disconnect}
          variant="outlined"
          style={{ position: "fixed", right: 24, top: 24 }}
        >
          Disconnect
        </Button>
      )}
      <Swap
        provider={newProvider}
        tokenList={tokenList as TokenListContainer}
      />
    </Grid>
  );
};

interface AnchorWallet {
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  publicKey: PublicKey;
}

class NotifyingProvider extends anchor.Provider {
  // Function to call whenever the provider sends a transaction;
  private onTransaction: (
    tx: TransactionSignature | undefined,
    err?: Error
  ) => void;

  constructor(
    connection: Connection,
    wallet: Wallet,
    opts: ConfirmOptions,
    onTransaction: (tx: TransactionSignature | undefined, err?: Error) => void
  ) {
    const newWallet = wallet as AnchorWallet;
    super(connection, newWallet, opts);
    this.onTransaction = onTransaction;
  }

  async send(
    tx: Transaction,
    signers?: Array<Signer | undefined>,
    opts?: ConfirmOptions
  ): Promise<TransactionSignature> {
    try {
      const txSig = await super.send(tx, signers, opts);
      this.onTransaction(txSig);
      return txSig;
    } catch (err) {
      if (err instanceof Error || err === undefined) {
        this.onTransaction(undefined, err);
      }
      return "";
    }
  }

  async sendAll(
    txs: Array<{ tx: Transaction; signers: Array<Signer | undefined> }>,
    opts?: ConfirmOptions
  ): Promise<Array<TransactionSignature>> {
    try {
      const txSigs = await super.sendAll(txs, opts);
      txSigs.forEach((sig) => {
        this.onTransaction(sig);
      });
      return txSigs;
    } catch (err) {
      if (err instanceof Error || err === undefined) {
        this.onTransaction(undefined, err);
      }
      return [];
    }
  }
}
