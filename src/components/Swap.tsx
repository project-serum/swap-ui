import { useState } from "react";
import {
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  Signer,
  Account,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  u64,
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { OpenOrders } from "@project-serum/serum";
import { BN, Provider } from "@project-serum/anchor";
import {
  makeStyles,
  Card,
  Button,
  Typography,
  TextField,
  useTheme,
} from "@material-ui/core";
import { ExpandMore, ImportExportRounded } from "@material-ui/icons";
import { useSwapContext, useSwapFair } from "../context/Swap";
import {
  useDexContext,
  useOpenOrders,
  useRouteVerbose,
  useMarket,
  FEE_MULTIPLIER,
} from "../context/Dex";
import { useTokenMap } from "../context/TokenList";
import {
  useMint,
  useOwnedTokenAccount,
  useTokenContext,
} from "../context/Token";
import { useCanSwap, useReferral, useIsWrapSol } from "../context/Swap";
import TokenDialog from "./TokenDialog";
import { SettingsButton } from "./Settings";
import { InfoLabel } from "./Info";
import { SOL_MINT, WRAPPED_SOL_MINT, DEX_PID } from "../utils/pubkeys";

const useStyles = makeStyles((theme) => ({
  card: {
    width: theme.spacing(50),
    borderRadius: theme.spacing(2),
    boxShadow: "0px 0px 30px 5px rgba(0,0,0,0.075)",
    padding: theme.spacing(2),
  },
  tab: {
    width: "50%",
  },
  settingsButton: {
    padding: 0,
  },
  swapButton: {
    width: "100%",
    borderRadius: theme.spacing(2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontSize: 16,
    fontWeight: 700,
    padding: theme.spacing(1.5),
  },
  swapToFromButton: {
    display: "block",
    margin: "10px auto 10px auto",
    cursor: "pointer",
  },
  amountInput: {
    fontSize: 22,
    fontWeight: 600,
  },
  input: {
    textAlign: "right",
  },
  swapTokenFormContainer: {
    borderRadius: theme.spacing(2),
    boxShadow: "0px 0px 15px 2px rgba(33,150,243,0.1)",
    display: "flex",
    justifyContent: "space-between",
    padding: theme.spacing(1),
  },
  swapTokenSelectorContainer: {
    marginLeft: theme.spacing(1),
    display: "flex",
    flexDirection: "column",
    width: "50%",
  },
  balanceContainer: {
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
  },
  maxButton: {
    marginLeft: theme.spacing(1),
    color: theme.palette.primary.main,
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
  },
  tokenButton: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    marginBottom: theme.spacing(1),
  },
}));

export default function SwapCard({
  containerStyle,
  contentStyle,
  swapTokenContainerStyle,
}: {
  containerStyle?: any;
  contentStyle?: any;
  swapTokenContainerStyle?: any;
}) {
  const styles = useStyles();
  return (
    <Card className={styles.card} style={containerStyle}>
      <SwapHeader />
      <div style={contentStyle}>
        <SwapFromForm style={swapTokenContainerStyle} />
        <ArrowButton />
        <SwapToForm style={swapTokenContainerStyle} />
        <InfoLabel />
        <SwapButton />
      </div>
    </Card>
  );
}

export function SwapHeader() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "16px",
      }}
    >
      <Typography
        style={{
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        SWAP
      </Typography>
      <SettingsButton />
    </div>
  );
}

export function ArrowButton() {
  const styles = useStyles();
  const theme = useTheme();
  const { swapToFromMints } = useSwapContext();
  return (
    <ImportExportRounded
      className={styles.swapToFromButton}
      fontSize="large"
      htmlColor={theme.palette.primary.main}
      onClick={swapToFromMints}
    />
  );
}

function SwapFromForm({ style }: { style?: any }) {
  const { fromMint, setFromMint, fromAmount, setFromAmount } = useSwapContext();
  return (
    <SwapTokenForm
      from
      style={style}
      mint={fromMint}
      setMint={setFromMint}
      amount={fromAmount}
      setAmount={setFromAmount}
    />
  );
}

function SwapToForm({ style }: { style?: any }) {
  const { toMint, setToMint, toAmount, setToAmount } = useSwapContext();
  return (
    <SwapTokenForm
      from={false}
      style={style}
      mint={toMint}
      setMint={setToMint}
      amount={toAmount}
      setAmount={setToAmount}
    />
  );
}

export function SwapTokenForm({
  from,
  style,
  mint,
  setMint,
  amount,
  setAmount,
}: {
  from: boolean;
  style?: any;
  mint: PublicKey;
  setMint: (m: PublicKey) => void;
  amount: number;
  setAmount: (a: number) => void;
}) {
  const styles = useStyles();

  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const tokenAccount = useOwnedTokenAccount(mint);
  const mintAccount = useMint(mint);

  const balance =
    tokenAccount &&
    mintAccount &&
    tokenAccount.account.amount.toNumber() / 10 ** mintAccount.decimals;

  const formattedAmount =
    mintAccount && amount
      ? amount.toLocaleString("fullwide", {
          maximumFractionDigits: mintAccount.decimals,
          useGrouping: false,
        })
      : amount;

  return (
    <div className={styles.swapTokenFormContainer} style={style}>
      <div className={styles.swapTokenSelectorContainer}>
        <TokenButton mint={mint} onClick={() => setShowTokenDialog(true)} />
        <Typography color="textSecondary" className={styles.balanceContainer}>
          {tokenAccount && mintAccount
            ? `Balance: ${balance?.toFixed(mintAccount.decimals)}`
            : `-`}
          {from && !!balance ? (
            <span
              className={styles.maxButton}
              onClick={() => setAmount(balance)}
            >
              MAX
            </span>
          ) : null}
        </Typography>
      </div>
      <TextField
        type="number"
        value={formattedAmount}
        onChange={(e) => setAmount(parseFloat(e.target.value))}
        InputProps={{
          disableUnderline: true,
          classes: {
            root: styles.amountInput,
            input: styles.input,
          },
        }}
      />
      <TokenDialog
        setMint={setMint}
        open={showTokenDialog}
        onClose={() => setShowTokenDialog(false)}
      />
    </div>
  );
}

function TokenButton({
  mint,
  onClick,
}: {
  mint: PublicKey;
  onClick: () => void;
}) {
  const styles = useStyles();
  const theme = useTheme();

  return (
    <div onClick={onClick} className={styles.tokenButton}>
      <TokenIcon mint={mint} style={{ width: theme.spacing(4) }} />
      <TokenName mint={mint} style={{ fontSize: 14, fontWeight: 700 }} />
      <ExpandMore />
    </div>
  );
}

export function TokenIcon({ mint, style }: { mint: PublicKey; style: any }) {
  const tokenMap = useTokenMap();
  let tokenInfo = tokenMap.get(mint.toString());
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      {tokenInfo?.logoURI ? (
        <img alt="Logo" style={style} src={tokenInfo?.logoURI} />
      ) : (
        <div style={style}></div>
      )}
    </div>
  );
}

function TokenName({ mint, style }: { mint: PublicKey; style: any }) {
  const tokenMap = useTokenMap();
  const theme = useTheme();
  let tokenInfo = tokenMap.get(mint.toString());
  return (
    <Typography
      style={{
        marginLeft: theme.spacing(2),
        marginRight: theme.spacing(1),
        ...style,
      }}
    >
      {tokenInfo?.symbol}
    </Typography>
  );
}

export function SwapButton() {
  const styles = useStyles();
  const {
    fromMint,
    toMint,
    fromAmount,
    slippage,
    isClosingNewAccounts,
    isStrict,
  } = useSwapContext();
  const { swapClient, isLoaded: isDexLoaded } = useDexContext();
  const { isLoaded: isTokensLoaded } = useTokenContext();
  const fromMintInfo = useMint(fromMint);
  const toMintInfo = useMint(toMint);
  const openOrders = useOpenOrders();
  const route = useRouteVerbose(fromMint, toMint);
  const fromMarket = useMarket(
    route && route.markets ? route.markets[0] : undefined
  );
  const toMarket = useMarket(
    route && route.markets ? route.markets[1] : undefined
  );
  const canSwap = useCanSwap();
  const referral = useReferral(fromMarket);
  const fair = useSwapFair();
  let fromWallet = useOwnedTokenAccount(fromMint);
  let toWallet = useOwnedTokenAccount(toMint);
  const quoteMint = fromMarket && fromMarket.quoteMintAddress;
  const quoteMintInfo = useMint(quoteMint);
  const quoteWallet = useOwnedTokenAccount(quoteMint);
  const { isWrapSol, isUnwrapSol } = useIsWrapSol(fromMint, toMint);
  const fromOpenOrders = fromMarket
    ? openOrders.get(fromMarket?.address.toString())
    : undefined;
  const toOpenOrders = toMarket
    ? openOrders.get(toMarket?.address.toString())
    : undefined;
  const disconnected = !swapClient.program.provider.wallet.publicKey;
  const needsCreateAccounts =
    !toWallet || !fromOpenOrders || (toMarket && !toOpenOrders);

  // Click handlers.
  const sendCreateAccountsTransaction = async () => {
    if (!fromMintInfo || !toMintInfo) {
      throw new Error("Unable to calculate mint decimals");
    }
    if (!quoteMint || !quoteMintInfo) {
      throw new Error("Quote mint not found");
    }
    const tx = new Transaction();
    const signers = [];
    if (!toWallet) {
      const associatedTokenPubkey = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        toMint,
        swapClient.program.provider.wallet.publicKey
      );
      tx.add(
        Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          toMint,
          associatedTokenPubkey,
          swapClient.program.provider.wallet.publicKey,
          swapClient.program.provider.wallet.publicKey
        )
      );
    }
    if (!quoteWallet && !quoteMint.equals(toMint)) {
      const quoteAssociatedPubkey = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        quoteMint,
        swapClient.program.provider.wallet.publicKey
      );
      tx.add(
        Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          quoteMint,
          quoteAssociatedPubkey,
          swapClient.program.provider.wallet.publicKey,
          swapClient.program.provider.wallet.publicKey
        )
      );
    }
    if (fromMarket && !fromOpenOrders) {
      const ooFrom = Keypair.generate();
      signers.push(ooFrom);
      tx.add(
        await OpenOrders.makeCreateAccountTransaction(
          swapClient.program.provider.connection,
          fromMarket.address,
          swapClient.program.provider.wallet.publicKey,
          ooFrom.publicKey,
          DEX_PID
        )
      );
      tx.add(
        swapClient.program.instruction.initAccount({
          accounts: {
            openOrders: ooFrom.publicKey,
            authority: swapClient.program.provider.wallet.publicKey,
            market: fromMarket.address,
            dexProgram: DEX_PID,
            rent: SYSVAR_RENT_PUBKEY,
          },
        })
      );
    }
    if (toMarket && !toOpenOrders) {
      const ooTo = Keypair.generate();
      signers.push(ooTo);
      tx.add(
        await OpenOrders.makeCreateAccountTransaction(
          swapClient.program.provider.connection,
          toMarket.address,
          swapClient.program.provider.wallet.publicKey,
          ooTo.publicKey,
          DEX_PID
        )
      );
      tx.add(
        swapClient.program.instruction.initAccount({
          accounts: {
            openOrders: ooTo.publicKey,
            authority: swapClient.program.provider.wallet.publicKey,
            market: toMarket.address,
            dexProgram: DEX_PID,
            rent: SYSVAR_RENT_PUBKEY,
          },
        })
      );
    }
    await swapClient.program.provider.send(tx, signers);

    // TODO: update local data stores to add the newly created token
    //       and open orders accounts.
  };
  const sendWrapSolTransaction = async () => {
    if (!fromMintInfo || !toMintInfo) {
      throw new Error("Unable to calculate mint decimals");
    }
    if (!quoteMint || !quoteMintInfo) {
      throw new Error("Quote mint not found");
    }
    const amount = new u64(fromAmount * 10 ** fromMintInfo.decimals);

    // If the user already has a wrapped SOL account, then we perform a
    // transfer to the existing wrapped SOl account by
    //
    // * generating a new one
    // * minting wrapped sol
    // * sending tokens to the previously existing wrapped sol account
    // * closing the newly created wrapped sol account
    //
    // If a wrapped SOL account doesn't exist, then we create an associated
    // token account to mint the SOL and then leave it open.
    //
    const wrappedSolAccount = toWallet ? Keypair.generate() : undefined;
    const wrappedSolPubkey = wrappedSolAccount
      ? wrappedSolAccount.publicKey
      : await Token.getAssociatedTokenAddress(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          fromMint,
          swapClient.program.provider.wallet.publicKey
        );

    // Wrap the SOL.
    const { tx, signers } = await wrapSol(
      swapClient.program.provider,
      fromMint,
      amount,
      wrappedSolAccount
    );

    // Close the newly created account, if needed.
    if (toWallet) {
      tx.add(
        Token.createTransferInstruction(
          TOKEN_PROGRAM_ID,
          wrappedSolPubkey,
          toWallet.publicKey,
          swapClient.program.provider.wallet.publicKey,
          [],
          amount
        )
      );
      const { tx: unwrapTx, signers: unwrapSigners } = unwrapSol(
        swapClient.program.provider,
        wrappedSolPubkey
      );
      tx.add(unwrapTx);
      signers.push(...unwrapSigners);
    }
    await swapClient.program.provider.send(tx, signers);
  };
  const sendUnwrapSolTransaction = async () => {
    if (!fromMintInfo || !toMintInfo) {
      throw new Error("Unable to calculate mint decimals");
    }
    if (!quoteMint || !quoteMintInfo) {
      throw new Error("Quote mint not found");
    }
    const amount = new u64(fromAmount * 10 ** fromMintInfo.decimals);

    // Unwrap *without* closing the existing wrapped account:
    //
    // * Create a new Wrapped SOL account.
    // * Send wrapped tokens there.
    // * Unwrap (i.e. close the newly created wrapped account).
    const wrappedSolAccount = Keypair.generate();
    const { tx, signers } = await wrapSol(
      swapClient.program.provider,
      fromMint,
      amount,
      wrappedSolAccount
    );
    tx.add(
      Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        fromWallet!.publicKey,
        wrappedSolAccount.publicKey,
        swapClient.program.provider.wallet.publicKey,
        [],
        amount
      )
    );
    const { tx: unwrapTx, signers: unwrapSigners } = unwrapSol(
      swapClient.program.provider,
      wrappedSolAccount.publicKey
    );
    tx.add(unwrapTx);
    signers.push(...unwrapSigners);

    await swapClient.program.provider.send(tx, signers);
  };
  const sendSwapTransaction = async () => {
    if (!fromMintInfo || !toMintInfo) {
      throw new Error("Unable to calculate mint decimals");
    }
    if (!fair) {
      throw new Error("Invalid fair");
    }
    if (!quoteMint || !quoteMintInfo) {
      throw new Error("Quote mint not found");
    }

    const amount = new BN(fromAmount * 10 ** fromMintInfo.decimals);
    const isSol = fromMint.equals(SOL_MINT) || toMint.equals(SOL_MINT);
    const wrappedSolAccount = isSol ? Keypair.generate() : undefined;

    // Build the swap.
    let txs = await (async () => {
      if (!fromMarket) {
        throw new Error("Market undefined");
      }

      const minExchangeRate = {
        rate: new BN((10 ** toMintInfo.decimals * FEE_MULTIPLIER) / fair)
          .muln(100 - slippage)
          .divn(100),
        fromDecimals: fromMintInfo.decimals,
        quoteDecimals: quoteMintInfo.decimals,
        strict: isStrict,
      };
      const fromWalletAddr = fromMint.equals(SOL_MINT)
        ? wrappedSolAccount!.publicKey
        : fromWallet
        ? fromWallet.publicKey
        : undefined;
      const toWalletAddr = toMint.equals(SOL_MINT)
        ? wrappedSolAccount!.publicKey
        : toWallet
        ? toWallet.publicKey
        : undefined;

      return await swapClient.swapTxs({
        fromMint,
        toMint,
        quoteMint,
        amount,
        minExchangeRate,
        referral,
        fromMarket,
        toMarket,
        // Automatically created if undefined.
        fromOpenOrders: fromOpenOrders ? fromOpenOrders[0].address : undefined,
        toOpenOrders: toOpenOrders ? toOpenOrders[0].address : undefined,
        fromWallet: fromWalletAddr,
        toWallet: toWalletAddr,
        quoteWallet: quoteWallet ? quoteWallet.publicKey : undefined,
        // Auto close newly created open orders accounts.
        close: isClosingNewAccounts,
      });
    })();

    // If swapping SOL, then insert a wrap/unwrap instruction.
    if (isSol) {
      if (txs.length > 1) {
        throw new Error("SOL must be swapped in a single transaction");
      }
      const { tx: wrapTx, signers: wrapSigners } = await wrapSol(
        swapClient.program.provider,
        fromMint,
        amount,
        wrappedSolAccount as Keypair
      );
      const { tx: unwrapTx, signers: unwrapSigners } = unwrapSol(
        swapClient.program.provider,
        wrappedSolAccount!.publicKey
      );
      const tx = new Transaction();
      tx.add(wrapTx);
      tx.add(txs[0].tx);
      tx.add(unwrapTx);
      txs[0].tx = tx;
      txs[0].signers.push(...wrapSigners);
      txs[0].signers.push(...unwrapSigners);
    }

    await swapClient.program.provider.sendAll(txs);
  };

  if (disconnected) {
    return (
      <Button
        variant="contained"
        className={styles.swapButton}
        onClick={sendCreateAccountsTransaction}
        disabled={true}
      >
        Disconnected
      </Button>
    );
  }
  if (!isDexLoaded || !isTokensLoaded) {
    return (
      <Button
        variant="contained"
        className={styles.swapButton}
        onClick={sendSwapTransaction}
        disabled={true}
      >
        Swap
      </Button>
    );
  }
  return needsCreateAccounts ? (
    <Button
      variant="contained"
      className={styles.swapButton}
      onClick={sendCreateAccountsTransaction}
    >
      Create Accounts
    </Button>
  ) : isWrapSol ? (
    <Button
      variant="contained"
      className={styles.swapButton}
      onClick={sendWrapSolTransaction}
      disabled={!canSwap}
    >
      Wrap SOL
    </Button>
  ) : isUnwrapSol ? (
    <Button
      variant="contained"
      className={styles.swapButton}
      onClick={sendUnwrapSolTransaction}
      disabled={!canSwap}
    >
      Unwrap SOL
    </Button>
  ) : (
    <Button
      variant="contained"
      className={styles.swapButton}
      onClick={sendSwapTransaction}
      disabled={!canSwap}
    >
      Swap
    </Button>
  );
}

// If wrappedSolAccount is undefined, then creates the account with
// an associated token account.
async function wrapSol(
  provider: Provider,
  fromMint: PublicKey,
  amount: BN,
  wrappedSolAccount?: Keypair
): Promise<{ tx: Transaction; signers: Array<Signer | undefined> }> {
  const tx = new Transaction();
  const signers = wrappedSolAccount ? [wrappedSolAccount] : [];
  let wrappedSolPubkey;
  // Create new, rent exempt account.
  if (wrappedSolAccount === undefined) {
    wrappedSolPubkey = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      fromMint,
      provider.wallet.publicKey
    );
    tx.add(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        fromMint,
        wrappedSolPubkey,
        provider.wallet.publicKey,
        provider.wallet.publicKey
      )
    );
  } else {
    wrappedSolPubkey = wrappedSolAccount.publicKey;
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: wrappedSolPubkey,
        lamports: await Token.getMinBalanceRentForExemptAccount(
          provider.connection
        ),
        space: 165,
        programId: TOKEN_PROGRAM_ID,
      })
    );
  }
  // Transfer lamports. These will be converted to an SPL balance by the
  // token program.
  if (fromMint.equals(SOL_MINT)) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: wrappedSolPubkey,
        lamports: amount.toNumber(),
      })
    );
  }
  // Initialize the account.
  tx.add(
    Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      WRAPPED_SOL_MINT,
      wrappedSolPubkey,
      provider.wallet.publicKey
    )
  );
  return { tx, signers };
}

function unwrapSol(
  provider: Provider,
  wrappedSol: PublicKey
): { tx: Transaction; signers: Array<Signer | undefined> } {
  const tx = new Transaction();
  tx.add(
    Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      wrappedSol,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      []
    )
  );
  return { tx, signers: [] };
}
