import {FC, useState,useEffect,  useMemo } from "react";
import Mint from "./Mint";
import Aos from "aos";
import Countdown from "react-countdown";
import {  ConnectButton } from "./Buttons/Buttons";

import * as anchor from "@project-serum/anchor";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet,
  getSolletWallet,
  getSolletExtensionWallet,
} from "@solana/wallet-adapter-wallets";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { useWallet } from '@solana/wallet-adapter-react';

import { WalletDialogProvider } from "@solana/wallet-adapter-material-ui";
import { createTheme, ThemeProvider } from "@material-ui/core";


import { Link as RouterLink } from "react-router-dom";
import { AiOutlineHome } from "react-icons/ai";


interface Props {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    completed: boolean;
}

const treasury = new anchor.web3.PublicKey(
  process.env.REACT_APP_TREASURY_ADDRESS!
);

const config = new anchor.web3.PublicKey(
  process.env.REACT_APP_CANDY_MACHINE_CONFIG!
);

const candyMachineId = new anchor.web3.PublicKey(
  process.env.REACT_APP_CANDY_MACHINE_ID!
);

const network = process.env.REACT_APP_SOLANA_NETWORK as WalletAdapterNetwork;

const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST!;
const connection = new anchor.web3.Connection(rpcHost);

const startDateSeed = parseInt(process.env.REACT_APP_CANDY_START_DATE!, 10);

const txTimeout = 30000; // milliseconds (confirm this works for your project)

const theme = createTheme({
    palette: {
        type: 'dark',
    },
    overrides: {
        MuiButtonBase: {
            root: {
                justifyContent: 'flex-start',
            },
        },
        MuiButton: {
            root: {
                textTransform: undefined,
                padding: '12px 16px',
            },
            startIcon: {
                marginRight: 8,
            },
            endIcon: {
                marginLeft: 8,
            },
        },
    },
});

const App = () => {
    
  const endpoint = useMemo(() => clusterApiUrl(network), []);

  const wallets = useMemo(
    () => [
        getPhantomWallet(),
        getSlopeWallet(),
        getSolflareWallet(),
        getSolletWallet({ network }),
        getSolletExtensionWallet({ network })
    ],
    []
  );

  const wallet = useWallet();
 
  
  const [address, setAddress] = useState<string>('')

  useEffect(() => {
      Aos.init({ duration: 1000 });
  }, []);

//   useEffect(() => {
//     (async () => {        
//         if(wallet.publicKey)
//             setAddress(wallet.publicKey?.toString())
//     })();
//   }, [wallet, connection]);

  

  const currentDate = new Date(new Date().toUTCString()).getTime();
  const launchDate = new Date(Date.UTC(2022, 1, 26,22, 0, 0, 0)).getTime();

  const Completionist = () => (
      <span style={{ color: "#2D2D2D", fontWeight: 700, fontSize: "1.5rem" }}>
         SOLD OUT. Get one on Solsea!
      </span>
  );

  // Renderer callback with condition
  const renderer: FC<Props> = ({
      days,
      hours,
      minutes,
      seconds,
      completed,
  }) => {
      if (completed) {
          // Render a completed state
          return <Completionist />;
      } else {
          // Render a countdown
          return (
              <span
                  style={{
                      color: "#2D2D2D",
                      fontWeight: 600,
                      fontSize: "1.1rem",
                      margin: "1.5rem",
                  }}
              >
                  {days} Days | {hours} Hours | {minutes} Minutes | {seconds} Seconds
              </span>
          );
      }
  };

  return (
      <ThemeProvider theme={theme}>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect={true}>
            <WalletDialogProvider>
            <div className="flex flex-row justify-between items-center px-8 lg:px-12">
                <RouterLink
                    to="/"
                    className="flex flex-row items-center justify-center text-sm md:text-lg font-semibold"
                >
                    <AiOutlineHome className="mr-3" />
                    Back to Home
                </RouterLink>
                <div className="hidden lg:flex">
                    <Countdown
                        date={currentDate + (launchDate - currentDate)}
                        renderer={renderer}
                    />
                </div>
  <ConnectButton className="" style={{color: "#2d2d2d", backgroundColor:"white",border: "2px solid #2d2d2d", transition: "all 200ms ease-in-out",borderRadius : "30px", margin: "1.2rem 0"}}>Connect Wallet {address}</ConnectButton>
            </div>
            <div className="flex w-full justify-center items-center lg:hidden">
                <Countdown
                    date={currentDate + (launchDate - currentDate)}
                    renderer={renderer}
                />
            </div>
            
              <Mint
                candyMachineId={candyMachineId}
                connection={connection}
                txTimeout={txTimeout}
                rpcHost={rpcHost}
              />
            </WalletDialogProvider>
          </WalletProvider>
        </ConnectionProvider>
      </ThemeProvider>
  );
};

export default App;
