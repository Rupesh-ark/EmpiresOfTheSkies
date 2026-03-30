import React from "react";
import { MyGameProps } from "@eots/game";

const ShipYardDisplay = (props: MyGameProps) => {
  let shipyards: JSX.Element[] = [];
  let numberOfShipyards = 0;
  let colour = "transparent";
  if (props.playerID) {
    numberOfShipyards = props.G.playerInfo[props.playerID].shipyards;
    colour = props.G.playerInfo[props.playerID].colour;
  }
  for (let i = 0; i < 3; i++) {
    shipyards.push(
      <svg
        width="300"
        height="80"
        viewBox="0 0 300 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        opacity={i + 1 > numberOfShipyards ? 0.3 : 1}
        style={{ marginTop: "10px" }}
        key={`shipyard-${i}`}
      >
        <rect
          x="1"
          y="1"
          width="298"
          height="78"
          fill={colour}
          stroke="black"
          strokeWidth="2"
        />
        <rect
          x="1"
          y="1"
          width="148"
          height="78"
          fill={colour}
          stroke="black"
          strokeWidth="2"
        />
        <path
          d="M31.1211 25L37.6815 28.5786L44.2424 32.1569L37.6814 36.2358L31.1814 39.7358L24.5605 35.7358L18 32L24.5605 28.5786L31.1211 25Z"
          fill="#D7B469"
          stroke="#1A1A18"
          strokeWidth="0.288"
          strokeMiterlimit="22.9256"
        />
        <path
          d="M18.5406 46.6996L18.3609 39.468L18.1816 32.2358L24.6816 35.7358L31.1815 39.7358V46.7358V54.2358L24.8611 50.4677L18.5406 46.6996Z"
          fill="#D7B469"
          stroke="#1A1A18"
          strokeWidth="0.288"
          strokeMiterlimit="22.9256"
        />
        <path
          d="M31.1816 39.7358L37.8612 36.0039L44.1816 32.2358L44.002 39.4681L43.8226 46.7001L37.5021 50.4677L31.1816 54.2358V47.2358V39.7358Z"
          fill="#D7B469"
          stroke="#1A1A18"
          strokeWidth="0.288"
          strokeMiterlimit="22.9256"
        />
        <path
          d="M178.121 25L184.681 28.5786L191.242 32.1569L184.681 36.2358L178.181 39.7358L171.561 35.7358L165 32L171.561 28.5786L178.121 25Z"
          fill="#D7B469"
          stroke="#1A1A18"
          strokeWidth="0.288"
          strokeMiterlimit="22.9256"
        />
        <path
          d="M165.541 46.6996L165.361 39.468L165.182 32.2358L171.682 35.7358L178.181 39.7358V46.7358V54.2358L171.861 50.4677L165.541 46.6996Z"
          fill="#D7B469"
          stroke="#1A1A18"
          strokeWidth="0.288"
          strokeMiterlimit="22.9256"
        />
        <path
          d="M178.182 39.7358L184.861 36.0039L191.182 32.2358L191.002 39.4681L190.823 46.7001L184.502 50.4677L178.182 54.2358V47.2358V39.7358Z"
          fill="#D7B469"
          stroke="#1A1A18"
          strokeWidth="0.288"
          strokeMiterlimit="22.9256"
        />
        <path
          d="M89.0607 41.0607C89.6464 40.4749 89.6464 39.5251 89.0607 38.9393L79.5147 29.3934C78.9289 28.8076 77.9792 28.8076 77.3934 29.3934C76.8076 29.9792 76.8076 30.9289 77.3934 31.5147L85.8787 40L77.3934 48.4853C76.8076 49.0711 76.8076 50.0208 77.3934 50.6066C77.9792 51.1924 78.9289 51.1924 79.5147 50.6066L89.0607 41.0607ZM48 41.5H88V38.5H48V41.5Z"
          fill="black"
        />
        <path
          d="M237.061 41.0607C237.646 40.4749 237.646 39.5251 237.061 38.9393L227.515 29.3934C226.929 28.8076 225.979 28.8076 225.393 29.3934C224.808 29.9792 224.808 30.9289 225.393 31.5147L233.879 40L225.393 48.4853C224.808 49.0711 224.808 50.0208 225.393 50.6066C225.979 51.1924 226.929 51.1924 227.515 50.6066L237.061 41.0607ZM196 41.5H236V38.5H196V41.5Z"
          fill="black"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M266.464 39.103C278.319 39.103 287.929 41.3809 287.929 44.1912C287.929 47.0014 278.319 49.2793 266.464 49.2793C254.61 49.2793 245 47.0014 245 44.1912C245 41.3809 254.61 39.103 266.464 39.103Z"
          fill="#D9DADA"
        />
        <path
          d="M266.464 39.103C278.319 39.103 287.929 41.3809 287.929 44.1912C287.929 47.0014 278.319 49.2793 266.464 49.2793C254.61 49.2793 245 47.0014 245 44.1912C245 41.3809 254.61 39.103 266.464 39.103Z"
          stroke="#1A1A18"
          strokeWidth="0.288"
          strokeMiterlimit="22.9256"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M245 35.862H288V44.0029H245V35.862Z"
          fill="#D9DADA"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M266.465 31C278.319 31 287.929 33.2779 287.929 36.088C287.929 38.8984 278.319 41.1763 266.465 41.1763C254.61 41.1763 245 38.8984 245 36.088C245 33.2779 254.61 31 266.465 31Z"
          fill="#D9DADA"
        />
        <path
          d="M266.465 31C278.319 31 287.929 33.2779 287.929 36.088C287.929 38.8984 278.319 41.1763 266.465 41.1763C254.61 41.1763 245 38.8984 245 36.088C245 33.2779 254.61 31 266.465 31Z"
          stroke="#1A1A18"
          strokeWidth="0.288"
          strokeMiterlimit="22.9256"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M116.464 38.103C128.319 38.103 137.929 40.3809 137.929 43.1912C137.929 46.0014 128.319 48.2793 116.464 48.2793C104.61 48.2793 95 46.0014 95 43.1912C95 40.3809 104.61 38.103 116.464 38.103Z"
          fill="#D9DADA"
        />
        <path
          d="M116.464 38.103C128.319 38.103 137.929 40.3809 137.929 43.1912C137.929 46.0014 128.319 48.2793 116.464 48.2793C104.61 48.2793 95 46.0014 95 43.1912C95 40.3809 104.61 38.103 116.464 38.103Z"
          stroke="#1A1A18"
          strokeWidth="0.288"
          strokeMiterlimit="22.9256"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M95 34.862H138V43.0029H95V34.862Z"
          fill="#D9DADA"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M116.465 30C128.319 30 137.929 32.2779 137.929 35.088C137.929 37.8984 128.319 40.1763 116.465 40.1763C104.61 40.1763 95 37.8984 95 35.088C95 32.2779 104.61 30 116.465 30Z"
          fill="#D9DADA"
        />
        <path
          d="M116.465 30C128.319 30 137.929 32.2779 137.929 35.088C137.929 37.8984 128.319 40.1763 116.465 40.1763C104.61 40.1763 95 37.8984 95 35.088C95 32.2779 104.61 30 116.465 30Z"
          stroke="#1A1A18"
          strokeWidth="0.288"
          strokeMiterlimit="22.9256"
        />
      </svg>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>{shipyards}</div>
  );
};

export default ShipYardDisplay;
