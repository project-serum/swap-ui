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
  Popover,
  IconButton,
  Typography,
  Button,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Link,
} from "@material-ui/core";
import { ToggleButton } from "@material-ui/lab";
import { SettingsOutlined as Settings, Close } from "@material-ui/icons";
import PopupState, { bindTrigger, bindPopover } from "material-ui-popup-state";
import { useSwapContext, useSwapFair } from "./context/Swap";
import { useMarket, useOpenOrders } from "./context/Dex";
import { useTokenList } from "./context/TokenList";
import { useMint } from "./context/Mint";

const useStyles = makeStyles(() => ({
  tab: {
    width: "50%",
  },
  table: {},
  settingsButton: {
    padding: 0,
  },
}));

export function SettingsButton() {
  const styles = useStyles();

  return (
    <PopupState variant="popover">
      {
        //@ts-ignore
        (popupState) => (
          <div>
            <IconButton
              {...bindTrigger(popupState)}
              className={styles.settingsButton}
            >
              <Settings />
            </IconButton>
            <Popover
              {...bindPopover(popupState)}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              PaperProps={{ style: { borderRadius: "10px" } }}
            >
              <SettingsDetails />
            </Popover>
          </div>
        )
      }
    </PopupState>
  );
}

function SettingsDetails() {
  const { slippage, setSlippage, fairOverride, setFairOverride } =
    useSwapContext();
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const fair = useSwapFair();
  return (
    <div style={{ padding: "15px", width: "305px" }}>
      <Typography color="textSecondary" style={{ fontWeight: "bold" }}>
        Settings
      </Typography>
      <div style={{ marginTop: "10px" }}>
        <div>
          <Typography color="textSecondary">Slippage tolerance</Typography>
          <TextField
            type="number"
            placeholder="Error tolerance percentage"
            value={slippage}
            onChange={(e) => setSlippage(parseFloat(e.target.value))}
            style={{
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
            }}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
          />
        </div>
        <div style={{ marginTop: "5px" }}>
          <Typography color="textSecondary">Fair price</Typography>
          <div style={{ display: "flex" }}>
            <TextField
              type="number"
              placeholder="Fair price override"
              value={fair}
              onChange={(e) => setFairOverride(parseFloat(e.target.value))}
              style={{
                marginRight: "10px",
                flex: 1,
                display: "flex",
                justifyContent: "center",
                flexDirection: "column",
              }}
              disabled={fairOverride === null}
            />
            <ToggleButton
              selected={fairOverride === null}
              onClick={() => {
                if (fair === undefined) {
                  console.error("Fair is undefined");
                  return;
                }
                if (fairOverride === null) {
                  setFairOverride(fair);
                } else {
                  setFairOverride(null);
                }
              }}
              style={{
                paddingTop: "3px",
                paddingBottom: "3px",
                paddingLeft: "5px",
                paddingRight: "5px",
                borderRadius: "20px",
              }}
            >
              Auto
            </ToggleButton>
          </div>
        </div>
        <Button
          style={{
            width: "100%",
            marginTop: "10px",
            background: "#e0e0e0",
          }}
          onClick={() => setShowSettingsDialog(true)}
        >
          Manage Dex Accounts
        </Button>
      </div>
      <SettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
      />
    </div>
  );
}

export function SettingsDialog({
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
            marginTop: "10px",
            paddingLeft: "24px",
            paddingRight: "24px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography
            color="textSecondary"
            variant="h6"
            style={{
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            Serum Accounts
          </Typography>
          <IconButton onClick={onClose}>
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
            <TableCell align="center">Action</TableCell>
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
  const marketClient = useMarket(market);
  const tokenList = useTokenList();
  const base = useMint(marketClient?.baseMintAddress);
  const quote = useMint(marketClient?.quoteMintAddress);
  const baseTicker = tokenList
    .filter((t) => t.address === marketClient?.baseMintAddress.toString())
    .map((t) => t.symbol)[0];
  const quoteTicker = tokenList
    .filter((t) => t.address === marketClient?.quoteMintAddress.toString())
    .map((t) => t.symbol)[0];
  const marketName =
    baseTicker && quoteTicker
      ? `${baseTicker} / ${quoteTicker}`
      : market.toString();
  const closeDisabled =
    ooAccount.baseTokenTotal.toNumber() +
      ooAccount.quoteTokenTotal.toNumber() !==
    0;

  const closeOpenOrders = async () => {
    // todo
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
              <MenuItem value={oo.address.toString()}>
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
