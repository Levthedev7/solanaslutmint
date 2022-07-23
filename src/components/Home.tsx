import { useEffect } from "react";
import styled from "styled-components";
import tw from "twin.macro";

import Aos from "aos";
import "aos/dist/aos.css";

import { MainButton } from "../components/Buttons/Buttons";
// import girl1 from "../assets/girls/homegirls.gif";

const Container = styled.div`
    ${tw`
        flex
        text-black
        flex-col
        justify-center
        space-y-10
        lg:px-12
        lg:pb-24
        my-10
        w-4/5
        max-w-3xl
        
    `};
`;

const Heading = styled.h1`
    ${tw`
    font-extrabold
    text-5xl
    md:text-6xl
    lg:text-7xl
    leading-snug

 `};
`;

const Hottest = styled.span`
    background: #ff4bdc;
    background: -webkit-linear-gradient(to bottom, #ff4bdc 39%, #0057ff 100%);
    background: -moz-linear-gradient(to bottom, #ff4bdc 39%, #0057ff 100%);
    background: linear-gradient(to bottom, #ff4bdc 39%, #0057ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
`;

const SubHeading = styled.div`
    ${tw`
    font-semibold
    text-xl
    leading-loose
 `};
`;

const Image = styled.img`
    ${tw`
        block
    `};
`;

const Home = () => {
    useEffect(() => {
        Aos.init({ duration: 2000 });
    }, []);

    return (
        <>
            <div
                id="home"
                className="relative overflow-hidden min-h-screen font-body  flex flex-col justify-center items-center lg:flex-row bg-home-bg bg-cover lg:space-x-12"
            >
                <Container>
                    <Heading id="hot-heading" data-aos="slide-right">
                        The <Hottest>hottest</Hottest> girls on blockchain right
                        now
                    </Heading>
                    <SubHeading data-aos="fade">
                        Tired of crazy network fees preventing you from trading
                        NFTs? Thinking of earning a passive income? Meet these
                        girls who shamelessly live on the Solana chain. Low
                        fees, high standards. No rules and no slut shaming. They
                        don’t disappoint.
                    </SubHeading>

                    <MainButton to="/mint" data-aos="flip-up">
                        <h1>Mint</h1>
                    </MainButton>
                </Container>
                {/* <Image src={girl1} data-aos="slide-left" /> */}
            </div>
        </>
    );
};

export default Home;
