import { useEffect, useState, useCallback, useMemo } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import girl from "../assets/girls/pimp_me_out.gif";
import {ConnectButton,   MintPageButton } from "./Buttons/Buttons";
import * as anchor from "@project-serum/anchor";
import tw from "twin.macro";
import { BsDiscord, BsTwitter } from "react-icons/bs";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import CounterInput from "./react-counter-input";
import {
  // CandyMachine,
  CandyMachineAccount,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  mintMulipleToken,
  shortenAddress
} from "./candy-machine";
import { useWallet } from '@solana/wallet-adapter-react';
import { toDate, formatNumber, getAtaForMint } from './utils';

const MintCard = styled.div`
    ${tw`
        flex
        flex-col
        relative
        z-10
        mx-6
        overflow-hidden
        justify-center
        items-center
        h-full
 `};
`;
const SocialIcon = styled.a`
    ${tw`
        text-4xl
        mx-5
        cursor-pointer
      text-black 
        transition-all 
        duration-300
    `};
`;
const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  // config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  // startDate: number;
  // treasury: anchor.web3.PublicKey;
  txTimeout: number;
  rpcHost: string;
}

const Home = (props: HomeProps) => {
  const [quantity, setQuantity] = useState(0);
  const basePrice = 0.9;
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

//whitelist
  const [isWhitelisted, SetWhitelisted] = useState(false);
  const [api_url, setUrl] = useState(process.env.REACT_APP_API_URL)


  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [discountPrice, setDiscountPrice] = useState<anchor.BN>();
  const [endDate, setEndDate] = useState<Date>();
  const [itemsRemaining, setItemsRemaining] = useState<number>();
  const [isWhitelistUser, setIsWhitelistUser] = useState(false);
  const [isPresale, setIsPresale] = useState(false);
  const [isUserMinting, setIsUserMinting] = useState(false);
  const [dispAddress, setDispAddress] = useState('');

  const [startDate, setStartDate] = useState(new Date(Date.UTC(2022, 1, 21,22, 0, 0, 0)).getTime());

  const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();

  const rpcUrl = props.rpcHost;
  const wallet = useWallet();


  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const anchorWallet = useMemo(() => {    
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;
  }, [wallet]);

  const refreshCandyMachineState = useCallback(async () => {
    
    if (!anchorWallet) {
      return;
    }
    if (props.candyMachineId) {
      try {
        const cndy = await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection,
        );
        let active =
          cndy?.state.goLiveDate?.toNumber() < new Date().getTime() / 1000;
        let presale = false;
        // whitelist mint?
        if (cndy?.state.whitelistMintSettings) {
          // is it a presale mint?
          if (
            cndy.state.whitelistMintSettings.presale &&
            (!cndy.state.goLiveDate ||
              cndy.state.goLiveDate.toNumber() > new Date().getTime() / 1000)
          ) {
            presale = true;
          }
          // is there a discount?
          if (cndy.state.whitelistMintSettings.discountPrice) {
            setDiscountPrice(cndy.state.whitelistMintSettings.discountPrice);
          } else {
            setDiscountPrice(undefined);
            // when presale=false and discountPrice=null, mint is restricted
            // to whitelist users only
            if (!cndy.state.whitelistMintSettings.presale) {
              cndy.state.isWhitelistOnly = true;
            }
          }
          // retrieves the whitelist token
          const mint = new anchor.web3.PublicKey(
            cndy.state.whitelistMintSettings.mint,
          );
          const token = (await getAtaForMint(mint, anchorWallet.publicKey))[0];

          try {
            const balance = await props.connection.getTokenAccountBalance(
              token,
            );
            let valid = parseInt(balance.value.amount) > 0;
            // only whitelist the user if the balance > 0
            setIsWhitelistUser(valid);
            active = (presale && valid) || active;
          } catch (e) {
            setIsWhitelistUser(false);
            // no whitelist user, no mint
            if (cndy.state.isWhitelistOnly) {
              active = false;
            }
            console.log('There was a problem fetching whitelist token balance');
            console.log(e);
          }
        }
        // datetime to stop the mint?
        if (cndy?.state.endSettings?.endSettingType.date) {
          setEndDate(toDate(cndy.state.endSettings.number));
          if (
            cndy.state.endSettings.number.toNumber() <
            new Date().getTime() / 1000
          ) {
            active = false;
          }
        }
        // amount to stop the mint?
        if (cndy?.state.endSettings?.endSettingType.amount) {
          let limit = Math.min(
            cndy.state.endSettings.number.toNumber(),
            cndy.state.itemsAvailable,
          );
          if (cndy.state.itemsRedeemed < limit) {
            setItemsRemaining(limit - cndy.state.itemsRedeemed);
          } else {
            setItemsRemaining(0);
            cndy.state.isSoldOut = true;
          }
        } else {
          setItemsRemaining(cndy.state.itemsRemaining);
        }

        if (cndy.state.isSoldOut) {
          active = false;
        }

        setIsActive((cndy.state.isActive = active));
        setIsPresale((cndy.state.isPresale = presale));
        setCandyMachine(cndy);
      } catch (e) {
        console.log('There was a problem fetching Candy Machine state');
        console.log(e);
      }
    }
  }, [anchorWallet, props.candyMachineId, props.connection]);


  useEffect(() => {
    (async () => {
      if (anchorWallet) {
        const balance = await props.connection.getBalance(anchorWallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
        setDispAddress(shortenAddress(anchorWallet.publicKey.toString()));
      }
    })();
  }, [wallet, props.connection]);


  useEffect(() => {
    refreshCandyMachineState();
  }, [
    anchorWallet,
    props.candyMachineId,
    props.connection,
    refreshCandyMachineState,
  ]);



  const startMintMultiple = async (quantity: number) => {
    onMint()
  };

  const handleQuantityChange = (count: number) => {
    setQuantity(count);
    console.log(quantity)
  };

  const onMint = async () => {
    if(quantity<1)
      return

    setAlertState({
      open: true,
      message: 'Please confirm '+quantity+' Pimp transaction(s) to mint!',
      severity: 'info',
    });
    for (let i = 0; i < quantity; i++) {
      await mintOne(i, quantity);
    }
  };

  const mintOne = async(idx:number, total:number) => {
    try {
      setIsUserMinting(true);
      document.getElementById('#identity')?.click();
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const mintTxId = (
          await mintOneToken(candyMachine, wallet.publicKey)          
        )[0];

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.txTimeout,
            props.connection,
            true,
          );
        }

        if (status && !status.err) {
          // manual update since the refresh might not detect
          // the change immediately
          let remaining = itemsRemaining! - 1;
          setItemsRemaining(remaining);
          setIsActive((candyMachine.state.isActive = remaining > 0));
          candyMachine.state.isSoldOut = remaining === 0;
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded! Transaction '+(idx+1)+' / '+quantity,
            severity: 'success',
          });
        } else {
          setAlertState({
            open: true,
            message: 'Mint failed! Please try again! Transaction '+(idx+1)+' / '+quantity,
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf('0x137')) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          window.location.reload();
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: 'error',
      });
      // updates the candy machine state to reflect the lastest
      // information on chain
      
      refreshCandyMachineState();
    } finally {

      setIsUserMinting(false);
    }
  }


  return (
    <main>
      <MintContainer>
        {!wallet.connected ? (
          <div className="flex flex-wrap flex-col lg:flex-row items-center justify-center min-h-screen">
          <MintCard data-aos="flip-left">
            {/* <h1 className="font-semibold text-2xl mt-5 mb-2">EARLY BIRD: SOLD OUT</h1> */}
            <h1 className="font-semibold text-2xl mt-2 mb-6">PRE-SALE: LIVE</h1>
            <h1 className="mt-5 text-center text-wrap lg:text-left font-bold text-3xl md:text-4xl">
                Mint Your Dream Pimp
            </h1>
            <h1 className="font-semibold text-2xl mt-6 mb-4">
                Mint Quantity
            </h1>
            <CounterInput
                      min={0}
                      max={10}
                      wrapperStyle={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          maxWidth: "100%",
                      }}
                      btnStyle={{
                          color: `#2D2D2D`,
                          fontSize: "30px",
                          fontWeight: "700",
                          margin: "0 1rem",
                      }}
                      inputStyle={{
                          alignItems: "center",
                          focus: "none",
                          outline: "3px solid #2d2d2d",
                          borderRadius: "8px",
                          width: "50%",
                          color: "#2D2D2D",
                          fontWeight: "700",
                          padding: "1rem 0",
                          minWidth: "10rem",
                          fontSize: "1.2rem",
                      }}
                      onCountChange={handleQuantityChange}
                  />
            <h1 className="font-normal text-sm my-2">
                10 max per transaction
            </h1>
            <h2 className="font-bold text-2xl mt-6">
                ~ {(quantity * basePrice)} SOL
            </h2> 
              
            <ConnectButton style={{color: "#2d2d2d", backgroundColor:"white",border: "2px solid #2d2d2d", transition: "all 200ms ease-in-out",borderRadius : "30px", margin: "2rem 0 0 0",padding: "0.5rem 2rem"}}>Connect Wallet to Mint</ConnectButton>
            
          </MintCard>
          <div className="flex relative lg:p-24 p-12 pt-4 justify-center items-center overflow-hidden">
              <img
                  src={girl}
                  alt="sitting girl illustration"
                  className="z-10"
              />
          </div>
          
      </div>
      
        ) : (
          <div>
             <div className="flex flex-wrap flex-col lg:flex-row items-center justify-center min-h-screen">
          <MintCard data-aos="flip-left">
          
         
          <h1 className="font-semibold text-2xl mt-5 mb-2">Connected: { dispAddress }</h1>
          {/* <h1 className="font-semibold text-2xl mt-5 mb-2">EARLY BIRD: SOLD OUT</h1> */}
            <h1 className="font-semibold text-2xl mt-2 mb-6">PRE-SALE: LIVE</h1>
              <h1 className="mt-5 text-center text-wrap lg:text-left font-bold text-3xl md:text-4xl">
                  Mint Your Dream Pimp
              </h1>
              <h1 className="font-semibold text-2xl mt-8 mb-4">
                  Mint Quantity
              </h1>
              <CounterInput
                        min={0}
                        max={10}
                        wrapperStyle={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            maxWidth: "100%",
                        }}
                        btnStyle={{
                            color: `#2D2D2D`,
                            fontSize: "30px",
                            fontWeight: "700",
                            margin: "0 1rem",
                        }}
                        inputStyle={{
                            alignItems: "center",
                            focus: "none",
                            outline: "3px solid #2d2d2d",
                            borderRadius: "8px",
                            width: "50%",
                            color: "#2D2D2D",
                            fontWeight: "700",
                            padding: "1rem 0",
                            minWidth: "10rem",
                            fontSize: "1.2rem",
                        }}
                        onCountChange={handleQuantityChange}
                    />
              <h1 className="font-normal text-sm my-2">
                  10 max per transaction
              </h1>
              <h2 className="font-bold text-2xl mt-6">
                  ~ {(quantity * basePrice)} SOL
              </h2>
              <MintButton
                  style={{
                    color: "#2d2d2d",
                    backgroundColor: "white",
                    border: "2px solid #2d2d2d",
                    transition: "all 200ms ease-in-out",
                    borderRadius: "30px",
                    margin: "2rem 0 0 0",
                    padding: "0.5rem 2rem",
                  }}
                  disabled={ isSoldOut || isMinting}
                  onClick={() => startMintMultiple(quantity)}
                  variant="contained"
                >
                {isSoldOut ? (
                  "SOLD OUT"
                  ) : (
                  isMinting ? (
                    <CircularProgress />
                    ) : (
                      "MINT"
                      )
                      ) }
              </MintButton>

                  {/* <Countdown
                    date={startDate}
                    onMount={({ completed }) => completed && setIsActive(true)}
                    onComplete={() => setIsActive(true)}
                    renderer={renderCounter}
                  /> */}
        
              <h2 className="font-semibold text-md mt-4 ">
              {wallet && <p>Balance: {(balance || 0).toLocaleString()} SOL</p>}
              </h2>
          </MintCard>
          <div className="flex relative lg:p-24 p-12 pt-4 justify-center items-center overflow-hidden">
              <img
                  src={girl}
                  alt="sitting girl illustration"
                  className="z-10"
              />
          </div>

      </div>
        
        </div>
        )}
      </MintContainer>
                    <div className="flex flex-col justify-center items-center">
                <div className="flex justify-center my-10">
                    <SocialIcon
                        href="https://twitter.com/SolanaSluts"
                        aria-label="Twitter"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <BsTwitter />
                    </SocialIcon>
                    <SocialIcon
                        href="https://discord.gg/SY5c6tQKrd"
                        aria-label="Discord"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <BsDiscord />
                    </SocialIcon>
                </div>
                <div>
                    <h2 className="font-medium text-black opacity-50 mb-12">
                        © 2021 Sol Sluts
                    </h2>
                </div>
            </div>
<Snackbar
        open={alertState.open}
        
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
        >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
