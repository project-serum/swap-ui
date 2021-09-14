
import bloctoLogo from "../assets/wallets/blocto.png";
import coin98Logo from "../assets/wallets/coin98.png";
import ledgerLogo from "../assets/wallets/ledger.png";
import mathwalletLogo from "../assets/wallets/mathwallet.png";
import phantomLogo from "../assets/wallets/phantom.png";
import solflareLogo from "../assets/wallets/solflare.png";
import solletLogo from "../assets/wallets/sollet.png";
import solongLogo from "../assets/wallets/solong.png";
import { BloctoWalletAdapter } from "./blocto";
import { Coin98WalletAdapter } from "./coin98";
import { LedgerWalletAdapter } from "./ledger";
import { MathWalletAdapter } from "./math";
import { PhantomWalletAdapter } from "./phantom";
import { SolanaWalletAdapter } from "./solana";
import { SolongWalletAdapter } from "./solong";




export { SolanaWalletAdapter };



export const WALLET_PROVIDERS = [
  {
    id: "phantom",
    name: "Phantom",
    url: "https://phantom.app/",
    icon: phantomLogo,
    adapter: PhantomWalletAdapter,
    isAvailable: () => !!(window as any).solana?.isPhantom
  },
  {
    id: "coin98",
    name: "Coin98",
    url: "https://www.coin98.com/",
    icon: coin98Logo,
    adapter: Coin98WalletAdapter,
    isAvailable: () => !!(window as any).coin98
  },
  {
    id: "solletext",
    name: "Sollet Extension",
    url: (window as any).sollet || "https://www.sollet.io",
    icon: solletLogo,
    adapter: SolanaWalletAdapter,
    isAvailable: () => !!(window as any).sollet
  },
  {
    id: "solong",
    name: "Solong",
    url: "https://solongwallet.com/",
    icon: solongLogo,
    adapter: SolongWalletAdapter,
    isAvailable: () => !!(window as any).solong
  },
  {
    id: "ledger",
    name: "Ledger",
    url: "https://www.ledger.com",
    icon: ledgerLogo,
    adapter: LedgerWalletAdapter,
    isAvailable: () => !!(window as any).solana
  },
  {
    id: "blocto",
    name: "Blocto",
    url: "https://blocto.portto.io/en/",
    icon: bloctoLogo,
    adapter: BloctoWalletAdapter,
    isAvailable: () => !!(window as any).solana?.isBlocto
  },
  {
    id: "math",
    name: "Math Wallet",
    url: "https://mathwallet.org",
    icon: mathwalletLogo,
    adapter: MathWalletAdapter,
    isAvailable: () => !!(window as any).solana?.isMathWallet
  },
  {
    id: "solletio",
    name: "Sollet",
    url: "https://www.sollet.io",
    icon: solletLogo,
    isAvailable: () => true
  },
  {
    id: "solflare",
    name: "Solflare",
    url: "https://solflare.com/access-wallet",
    icon: solflareLogo,
    isAvailable: () => true
  },
];
