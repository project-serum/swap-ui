import { WalletKitProvider } from "@gokiprotocol/walletkit";
import { SnackbarProvider } from "notistack";
import { Body } from "./Body";

const App: React.FC = () => {
  return (
    <WalletKitProvider
      app={{
        name: "Swap UI",
      }}
    >
      <SnackbarProvider maxSnack={5} autoHideDuration={3000}>
        <Body />
      </SnackbarProvider>
    </WalletKitProvider>
  );
};

export default App;
