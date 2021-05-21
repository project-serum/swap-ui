import { useState } from "react";
import {
  makeStyles,
  Popover,
  IconButton,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Switch,
  FormControlLabel,
  FormGroup,
} from "@material-ui/core";
import { ToggleButton } from "@material-ui/lab";
import { SettingsOutlined as Settings } from "@material-ui/icons";
import PopupState, { bindTrigger, bindPopover } from "material-ui-popup-state";
import { useSwapContext, useSwapFair } from "../context/Swap";
import { useDexContext } from "../context/Dex";
import OpenOrdersDialog from "./OpenOrdersDialog";

const useStyles = makeStyles((theme) => ({
  tab: {
    width: "50%",
  },
  table: {},
  settingsButton: {
    padding: 0,
  },
  closeAccountSwitchLabel: {
    color: theme.palette.text.secondary,
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
  const { swapClient } = useDexContext();

  const setSlippageHandler = (value?: number) => {
    setSlippage(!value || value < 0 ? 0 : value);
  };

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
            onChange={(e) => setSlippageHandler(parseFloat(e.target.value))}
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
              value="bold"
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
        <div style={{ marginTop: "5px" }}>
          <CloseNewAccountsSwitch />
        </div>
        <Button
          style={{
            width: "100%",
            marginTop: "10px",
            background: "#e0e0e0",
          }}
          disabled={swapClient.program.provider.wallet.publicKey === null}
          onClick={() => setShowSettingsDialog(true)}
        >
          Manage Dex Accounts
        </Button>
      </div>
      <OpenOrdersDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
      />
    </div>
  );
}

function CloseNewAccountsSwitch() {
  const styles = useStyles();
  const { isClosingNewAccounts, setIsClosingNewAccounts } = useSwapContext();

  return (
    <FormGroup row>
      <FormControlLabel
        classes={{ label: styles.closeAccountSwitchLabel }}
        labelPlacement="start"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginLeft: 0,
          width: "100%",
        }}
        control={
          <Switch
            checked={isClosingNewAccounts}
            onChange={() => setIsClosingNewAccounts(!isClosingNewAccounts)}
            color="primary"
          />
        }
        label="Close new accounts"
      />
    </FormGroup>
  );
}
