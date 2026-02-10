import React, { ReactNode } from "react";
import { MyGameProps } from "../../types";
import { Paper } from "@mui/material";

const LootValueTable = (props: MyGameProps) => {
  let mithrilAmount = 0;
  let stickyIchorAmount = 0;
  let magicDustAmount = 0;
  let dragonScalesAmount = 0;
  let krakenSkinAmount = 0;
  let pipeweedAmount = 0;

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      const currentBuilding = props.G.mapState.buildings[y][x].buildings;
      if (currentBuilding) {
        const currentTileLoot =
          props.G.mapState.currentTileArray[y][x].loot[currentBuilding];
        mithrilAmount += currentTileLoot.mithril;
        stickyIchorAmount += currentTileLoot.stickyIchor;
        magicDustAmount += currentTileLoot.magicDust;
        dragonScalesAmount += currentTileLoot.dragonScales;
        krakenSkinAmount += currentTileLoot.krakenSkin;
        pipeweedAmount += currentTileLoot.pipeweed;
      }
    }
  }
  const Row = (props: RowProps) => {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          padding: "10",
          whiteSpace: "pre",
          margin: 10,
        }}
      >
        {props.children}
      </div>
    );
  };
  interface RowProps {
    children: ReactNode;
  }
  return (
    <Paper style={{ margin: 20 }}>
      <div style={{ width: "100%", textAlign: "center" }}>
        Goods to Gold value
      </div>
      <Row>
        <div style={{ width: 175 }}>
          Mithril{" "}
          <svg width="28" height="31" viewBox="0 0 28 31" fill="none">
            <path
              d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z"
              fill="#ECEDED"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z"
              fill="#ECEDED"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z"
              fill="#ECEDED"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
          </svg>
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: mithrilAmount === 0 ? "#EAEAEA" : undefined,
            border:
              mithrilAmount === 0 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          4
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: mithrilAmount === 1 ? "#EAEAEA" : undefined,
            border:
              mithrilAmount === 1 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          4
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: mithrilAmount === 2 ? "#EAEAEA" : undefined,
            border:
              mithrilAmount === 2 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: mithrilAmount === 3 ? "#EAEAEA" : undefined,
            border:
              mithrilAmount === 3 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: mithrilAmount === 4 ? "#EAEAEA" : undefined,
            border:
              mithrilAmount === 4 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: mithrilAmount === 5 ? "#EAEAEA" : undefined,
            border:
              mithrilAmount === 5 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: mithrilAmount === 6 ? "#EAEAEA" : undefined,
            border:
              mithrilAmount === 6 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
      </Row>
      <Row>
        <div style={{ width: 175 }}>
          Magic Dust{" "}
          <svg width="28" height="31" viewBox="0 0 28 31" fill="none">
            <path
              d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z"
              fill="#F6B1B5"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z"
              fill="#F6B1B5"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z"
              fill="#F6B1B5"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
          </svg>{" "}
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: magicDustAmount === 0 ? "#F6B1B5" : undefined,
            border:
              magicDustAmount === 0 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          4
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: magicDustAmount === 1 ? "#F6B1B5" : undefined,
            border:
              magicDustAmount === 1 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          4
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: magicDustAmount === 2 ? "#F6B1B5" : undefined,
            border:
              magicDustAmount === 2 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: magicDustAmount === 3 ? "#F6B1B5" : undefined,
            border:
              magicDustAmount === 3 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: magicDustAmount === 4 ? "#F6B1B5" : undefined,
            border:
              magicDustAmount === 4 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: magicDustAmount === 5 ? "#F6B1B5" : undefined,
            border:
              magicDustAmount === 5 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: magicDustAmount === 6 ? "#F6B1B5" : undefined,
            border:
              magicDustAmount === 6 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
      </Row>
      <Row>
        <div style={{ width: 175 }}>
          Dragon Scales{" "}
          <svg width="28" height="31" viewBox="0 0 28 31" fill="none">
            <path
              d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z"
              fill="#52A6B2"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z"
              fill="#52A6B2"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z"
              fill="#52A6B2"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
          </svg>
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: dragonScalesAmount === 0 ? "#52A6B2" : undefined,
            border:
              dragonScalesAmount === 0
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: dragonScalesAmount === 1 ? "#52A6B2" : undefined,
            border:
              dragonScalesAmount === 1
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: dragonScalesAmount === 2 ? "#52A6B2" : undefined,
            border:
              dragonScalesAmount === 2
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: dragonScalesAmount === 3 ? "#52A6B2" : undefined,
            border:
              dragonScalesAmount === 3
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: dragonScalesAmount === 4 ? "#52A6B2" : undefined,
            border:
              dragonScalesAmount === 4
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: dragonScalesAmount === 5 ? "#52A6B2" : undefined,
            border:
              dragonScalesAmount === 5
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: dragonScalesAmount === 6 ? "#52A6B2" : undefined,
            border:
              dragonScalesAmount === 6
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: dragonScalesAmount === 7 ? "#52A6B2" : undefined,
            border:
              dragonScalesAmount === 7
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: dragonScalesAmount === 8 ? "#52A6B2" : undefined,
            border:
              dragonScalesAmount === 8
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: dragonScalesAmount === 9 ? "#52A6B2" : undefined,
            border:
              dragonScalesAmount === 9
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: dragonScalesAmount === 10 ? "#52A6B2" : undefined,
            border:
              dragonScalesAmount === 10
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
      </Row>
      <Row>
        <div style={{ width: 175 }}>
          Kraken Skin{" "}
          <svg width="28" height="31" viewBox="0 0 28 31" fill="none">
            <path
              d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z"
              fill="#B1AC7E"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z"
              fill="#B1AC7E"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z"
              fill="#B1AC7E"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
          </svg>
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: krakenSkinAmount === 0 ? "#B1AC7E" : undefined,
            border:
              krakenSkinAmount === 0 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: krakenSkinAmount === 1 ? "#B1AC7E" : undefined,
            border:
              krakenSkinAmount === 1 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: krakenSkinAmount === 2 ? "#B1AC7E" : undefined,
            border:
              krakenSkinAmount === 2 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: krakenSkinAmount === 3 ? "#B1AC7E" : undefined,
            border:
              krakenSkinAmount === 3 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: krakenSkinAmount === 4 ? "#B1AC7E" : undefined,
            border:
              krakenSkinAmount === 4 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: krakenSkinAmount === 5 ? "#B1AC7E" : undefined,
            border:
              krakenSkinAmount === 5 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: krakenSkinAmount === 6 ? "#B1AC7E" : undefined,
            border:
              krakenSkinAmount === 6 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: krakenSkinAmount === 6 ? "#B1AC7E" : undefined,
            border:
              krakenSkinAmount === 7 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: krakenSkinAmount === 6 ? "#B1AC7E" : undefined,
            border:
              krakenSkinAmount === 8 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: krakenSkinAmount === 6 ? "#B1AC7E" : undefined,
            border:
              krakenSkinAmount === 9 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: krakenSkinAmount === 6 ? "#B1AC7E" : undefined,
            border:
              krakenSkinAmount === 10 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
      </Row>
      <Row>
        <div style={{ width: 175 }}>
          Sticky Ichor{" "}
          <svg width="28" height="31" viewBox="0 0 28 31" fill="none">
            <path
              d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z"
              fill="#008BD2"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z"
              fill="#008BD2"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z"
              fill="#008BD2"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
          </svg>
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 0 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 0 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 1 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 1 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 2 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 2 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 3 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 3 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 4 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 4 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 5 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 5 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 6 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 6 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 7 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 7 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 8 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 8 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 9 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 9 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 10 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 10
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: stickyIchorAmount === 11 ? "#008BD2" : undefined,
            border:
              stickyIchorAmount === 11
                ? "2px solid black"
                : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
      </Row>
      <Row>
        <div style={{ width: 175 }}>
          Pipeweed{" "}
          <svg width="28" height="31" viewBox="0 0 28 31" fill="none">
            <path
              d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z"
              fill="#AE9675"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z"
              fill="#AE9675"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
            <path
              d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z"
              fill="#AE9675"
              stroke="#1A1A18"
              strokeWidth="0.288"
              strokeMiterlimit="22.9256"
            />
          </svg>
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 0 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 0 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 1 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 1 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          3
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 2 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 2 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 3 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 3 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 4 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 4 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          2
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 5 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 5 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 6 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 6 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 7 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 7 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 8 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 8 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 9 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 9 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 10 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 10 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
        <div
          style={{
            width: 30,
            textAlign: "center",
            backgroundColor: pipeweedAmount === 11 ? "#AE9675" : undefined,
            border:
              pipeweedAmount === 11 ? "2px solid black" : "1px solid #EAEAEA",
          }}
        >
          1
        </div>
      </Row>
    </Paper>
  );
};

export default LootValueTable;
