import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import girl from "../assets/girls/mintgirls.gif";
import {ConnectButton,   MintPageButton } from "./Buttons/Buttons";
import * as anchor from "@project-serum/anchor";
import tw from "twin.macro";
import { BsDiscord, BsTwitter } from "react-icons/bs";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import CounterInput from "./react-counter-input";
import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  mintMultipleToken,
  shortenAddress,
} from "./candy-machine";
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
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

//whitelist
  const [isWhitelisted, SetWhitelisted] = useState(false);
  const [api_url, setUrl] = useState(process.env.REACT_APP_API_URL)


  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );
     

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  


  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
        const data = await fetch(`${api_url}/whitelisted/member/${(wallet as anchor.Wallet).publicKey.toString()}`)
        if(data.status.toString() !== "404"){
          SetWhitelisted(true)
        }
        else{
          console.log("not found")
        }
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);

  const startMintMultiple = async (quantity: number) => {
    try {    
      setIsMinting(true);
      if (wallet && candyMachine?.program ) {
        const signedTransactions: any = await mintMultipleToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury,
          quantity
        );
        const promiseArray = [];
        console.log("check quantity", signedTransactions);

        for (let index = 0; index < signedTransactions.length; index++) {
          const tx = signedTransactions[index];
          console.log(tx);
          promiseArray.push(
            awaitTransactionSignatureConfirmation(
              tx,
              props.txTimeout,
              props.connection,
              "singleGossip",
              true
            )
          );
        }

        const allTransactionsResult = await Promise.all(promiseArray);
        let totalSuccess = 0;
        let totalFailure = 0;

        for (let index = 0; index < allTransactionsResult.length; index++) {
          const transactionStatus = allTransactionsResult[index];
          if (!transactionStatus?.err) {
            totalSuccess += 1;
          } else {
            totalFailure += 1;
          }
        }

        if (totalSuccess) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        
          console.log("Updated Reserves for user");
        }

        if (totalFailure) {
          setAlertState({
            open: true,
            message: `Some mints failed! ${totalFailure} mints failed! Check your wallet!`,
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.message || "Minting failed! Please try again!";
      if (!error.message) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        } else if (error.message === "You are not whitelisted") {
          message = error.message;
        } else if (error.message === "Not enough reserves") {
          message = error.message;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  
  const [quantity, setQuantity] = useState(0);
  const basePrice = 0.69;
  const handleQuantityChange = (count: number) => {
    setQuantity(count);
    console.log(quantity)
};

  return (
    <main>
      {/* {wallet && (
        <p>Wallet {shortenAddress(wallet.publicKey.toBase58() || "")}</p>
      )}

      {wallet && <p>Balance: {(balance || 0).toLocaleString()} SOL</p>}

      {wallet && <p>Total Available: {itemsAvailable}</p>}*/}
{/* 
      {wallet && <p>Redeemed: {itemsRedeemed}</p>}

      {wallet && <p>Remaining: {itemsRemaining}</p>}  */}

      <MintContainer>
        {!wallet ? (
          <div className="flex flex-wrap flex-col lg:flex-row items-center justify-center min-h-screen">
          <MintCard data-aos="flip-left">
            <h1 className="font-semibold text-2xl mt-5 mb-2">EARLY BIRD: SOLD OUT</h1>
            <h1 className="font-semibold text-2xl mt-2 mb-6">PRE-SALE: SOLD OUT</h1>
            <h1 className="mt-5 text-center text-wrap lg:text-left font-bold text-3xl md:text-4xl">
                Mint Your Dream Girl
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
              
            <ConnectButton style={{color: "#2d2d2d", backgroundColor:"white",border: "2px solid #2d2d2d", transition: "all 200ms ease-in-out",borderRadius : "30px", margin: "2rem 0 0 0",padding: "0.5rem 2rem"}}>Mint</ConnectButton>
            
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
          <h1 className="font-semibold text-2xl mt-5 mb-2">EARLY BIRD: SOLD OUT</h1>
            <h1 className="font-semibold text-2xl mt-2 mb-6">PRE-SALE: SOLD OUT</h1>
              <h1 className="mt-5 text-center text-wrap lg:text-left font-bold text-3xl md:text-4xl">
                  Mint Your Dream Girl
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
                  disabled={ isSoldOut || isMinting || !isActive}
                  onClick={() => startMintMultiple(quantity)}
                  variant="contained"
                >
            {isSoldOut ? (
              "SOLD OUT"
              ) : isActive ? (
              isMinting ? (
                <CircularProgress />
                ) : (
                  "MINT"
                  )
                  ) : (
              <Countdown
                date={startDate}
                onMount={({ completed }) => completed && setIsActive(true)}
                onComplete={() => setIsActive(true)}
                renderer={renderCounter}
              />
            )}
          </MintButton>
        
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
