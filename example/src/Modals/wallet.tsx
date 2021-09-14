import {
  Avatar,
  Box,
  Dialog,
  Button,
  DialogContent,
  DialogTitle,
  IconButton,
  Zoom,
  Typography,
  Card,
  CardActionArea,
  CardMedia,
} from "@material-ui/core";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import { TransitionProps } from "@material-ui/core/transitions";
import { Close } from "@material-ui/icons";
import { forwardRef } from "react";
import useWallet from "../hooks/useWallet";
import { WALLET_PROVIDERS } from "../wallet-adapters";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "space-around",
      margin: theme.spacing(2),
      gap: theme.spacing(2),
      [theme.breakpoints.down("xs")]: {
        margin: theme.spacing(0),
        gap: theme.spacing(1),
      }
    },
    card: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textTransform: "none",
      minWidth: "150px",
      [theme.breakpoints.down("xs")]: {
        width: "100%",
      },
    },
    area: {
      [theme.breakpoints.down("xs")]: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: theme.spacing(4),
      },
      padding: theme.spacing(1),
      textAlign: "center",
    },
    icon: {
      width: theme.spacing(5),
      height: theme.spacing(5),
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(2),
      marginLeft: "auto",
      marginRight: "auto",
      [theme.breakpoints.down("xs")]: {
        margin: theme.spacing(1),
      },
    },
  })
);

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children?: React.ReactElement<any, any> },
  ref: React.Ref<unknown>
) {
  return <Zoom ref={ref} {...props} />;
});

function WalletModal({ open, setter }: any) {
  const classes = useStyles();

  const { connectWallet } = useWallet();

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      onClose={() => setter(false)}
      fullWidth
      style={{maxHeight: "80vh", margin: "auto"}}
    >
      <DialogTitle>
        <Box display='flex' justifyContent='space-between' alignItems='center'>
          <Typography variant='h5'>Connect to a wallet</Typography>
          <IconButton
            aria-label='close'
            size='small'
            onClick={() => setter(false)}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box className={classes.root}>
          {WALLET_PROVIDERS.map((item: any) => (
            <Card
              key={item.id}
              variant='outlined'
              onClick={() => {
                connectWallet(item);
                setter(false);
              }}
              className={classes.card}
            >
              <CardActionArea className={classes.area}>
                <CardMedia
                  className={classes.icon}
                  image={item.icon}
                  title={item.name}
                />
                <Typography variant='body1'>{item.name}</Typography>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default WalletModal;
