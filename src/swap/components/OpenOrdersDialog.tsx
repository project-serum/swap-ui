import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { MintInfo } from "@solana/spl-token";
import { BN } from "@project-serum/anchor";
import { OpenOrders } from "@project-serum/serum";
import {
  makeStyles,
  Dialog,
  DialogContent,
  Paper,
  Table,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
  TableContainer,
  IconButton,
  Typography,
  Button,
  Select,
  MenuItem,
  Link,
} from "@material-ui/core";
import { Close } from "@material-ui/icons";
import { useMarket, useOpenOrders, useDexContext } from "../context/Dex";
import { useTokenMap } from "../context/TokenList";
import { useMint } from "../context/Mint";
import { useOwnedTokenAccount } from "../context/Token";

const useStyles = makeStyles((theme) => ({
  table: {},
  closeAccountSwitchLabel: {
    color: theme.palette.text.secondary,
  },
}));

export default function OpenOrdersDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      maxWidth="lg"
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          borderRadius: "10px",
        },
      }}
    >
      <div>
        <div
          style={{
            height: "24px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <IconButton
            onClick={onClose}
            style={{
              padding: 0,
              position: "absolute",
              right: "8px",
              top: "8px",
            }}
          >
            <Close />
          </IconButton>
        </div>
        <DialogContent style={{ paddingTop: 0 }}>
          <OpenOrdersAccounts />
        </DialogContent>
      </div>
    </Dialog>
  );
}

function OpenOrdersAccounts() {
  const styles = useStyles();
  const openOrders = useOpenOrders();
  return (
    <TableContainer component={Paper} elevation={0}>
      <Table className={styles.table} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Market</TableCell>
            <TableCell align="center">Open Orders Account</TableCell>
            <TableCell align="center">Base Used</TableCell>
            <TableCell align="center">Base Free</TableCell>
            <TableCell align="center">Quote Used</TableCell>
            <TableCell align="center">Quote Free</TableCell>
            <TableCell align="center">Settle</TableCell>
            <TableCell align="center">Close</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from(openOrders.entries()).map(([market, oos]) => {
            return (
              <OpenOrdersRow
                key={market}
                market={new PublicKey(market)}
                openOrders={oos}
              />
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function OpenOrdersRow({
  market,
  openOrders,
}: {
  market: PublicKey;
  openOrders: Array<OpenOrders>;
}) {
  const [ooAccount, setOoAccount] = useState(openOrders[0]);
  const { swapClient } = useDexContext();
  const marketClient = useMarket(market);
  const tokenMap = useTokenMap();
  const base = useMint(marketClient?.baseMintAddress);
  const quote = useMint(marketClient?.quoteMintAddress);
  const baseWallet = useOwnedTokenAccount(marketClient?.baseMintAddress);
  const quoteWallet = useOwnedTokenAccount(marketClient?.quoteMintAddress);
  const baseTicker = marketClient
    ? tokenMap.get(marketClient?.baseMintAddress.toString())?.symbol
    : "-";
  const quoteTicker = marketClient
    ? tokenMap.get(marketClient?.quoteMintAddress.toString())?.symbol
    : "-";
  const marketName =
    baseTicker && quoteTicker
      ? `${baseTicker} / ${quoteTicker}`
      : market.toString();
  const settleDisabled =
    ooAccount.baseTokenFree.toNumber() + ooAccount.quoteTokenFree.toNumber() ===
    0;
  const closeDisabled =
    ooAccount.baseTokenTotal.toNumber() +
      ooAccount.quoteTokenTotal.toNumber() !==
    0;

  const settleFunds = async () => {
    if (!marketClient) {
      throw new Error("Market client not found");
    }
    if (!baseWallet || !quoteWallet) {
      throw new Error("Base or quote wallet not found");
    }
    const referrerWallet = undefined;
    const { transaction, signers } =
      await marketClient.makeSettleFundsTransaction(
        swapClient.program.provider.connection,
        ooAccount,
        baseWallet.publicKey,
        quoteWallet.publicKey,
        referrerWallet
      );
    await swapClient.program.provider.send(transaction, signers);
  };

  const closeOpenOrders = async () => {
    // TODO.
    //
    // Blocked by https://github.com/project-serum/serum-dex/pull/112.
  };

  return (
    <TableRow key={market.toString()}>
      <TableCell component="th" scope="row">
        <Typography>
          <Link
            href={`https://dex.projectserum.com/#/market/${market.toString()}`}
            target="_blank"
            rel="noopener"
          >
            {marketName}
          </Link>
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Select
          value={ooAccount.address.toString()}
          onChange={(e) =>
            setOoAccount(
              openOrders.filter(
                (oo) => oo.address.toString() === e.target.value
              )[0]
            )
          }
        >
          {openOrders.map((oo) => {
            return (
              <MenuItem
                key={oo.address.toString()}
                value={oo.address.toString()}
              >
                {oo.address.toString()}
              </MenuItem>
            );
          })}
        </Select>
      </TableCell>
      <TableCell align="center">
        {toDisplay(base, ooAccount.baseTokenTotal.sub(ooAccount.baseTokenFree))}
      </TableCell>
      <TableCell align="center">
        {toDisplay(base, ooAccount.baseTokenFree)}
      </TableCell>
      <TableCell align="center">
        {toDisplay(
          quote,
          ooAccount.quoteTokenTotal.sub(ooAccount.quoteTokenFree)
        )}
      </TableCell>
      <TableCell align="center">
        {toDisplay(quote, ooAccount.quoteTokenFree)}
      </TableCell>
      <TableCell align="center">
        <Button color="primary" disabled={settleDisabled} onClick={settleFunds}>
          Settle
        </Button>
      </TableCell>
      <TableCell align="center">
        <Button
          color="secondary"
          disabled={closeDisabled}
          onClick={closeOpenOrders}
        >
          Close
        </Button>
      </TableCell>
    </TableRow>
  );
}

function toDisplay(mintInfo: MintInfo | undefined | null, value: BN): string {
  if (!mintInfo) {
    return value.toNumber().toString();
  }
  return (value.toNumber() / 10 ** mintInfo.decimals).toFixed(
    mintInfo.decimals
  );
}
