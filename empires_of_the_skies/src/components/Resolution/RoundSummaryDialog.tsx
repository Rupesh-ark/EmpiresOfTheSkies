import { useState } from "react";
import { List, ListItem, ListItemText, ListItemIcon, Divider, Typography } from "@mui/material";
import { Gavel, AttachMoney, Shield, HowToVote, Warning } from "@mui/icons-material";
import { GiTrumpetFlag, GiTwoCoins } from "react-icons/gi";
import { MyGameProps, EVENT_CARD_DEFS, phaseGroup } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { DIALOG_PRIORITY } from "@/components/atoms/DialogQueue";
import React from "react";

const RoundSummaryDialog = (props: MyGameProps) => {
  const [spectatorClosedRound, setSpectatorClosedRound] = useState<number | null>(null);
  const currentRound = props.G.round;
  const roundSummaryAck = props.G.roundSummaryAck ?? [];
  const isGateOpen = phaseGroup(props.ctx.phase!) === "reset" && props.G.step === "round_summary";
  const isSpectator = !props.playerID;
  const localPlayerAcked = !!props.playerID && roundSummaryAck.includes(props.playerID);
  const pendingAckIDs = props.ctx.playOrder.filter((id) => !roundSummaryAck.includes(id));
  const pendingKingdoms = pendingAckIDs.map((id) => props.G.playerInfo[id]?.kingdomName ?? `Player ${id}`);

  // This dialog is always mounted; skip building the summary (log scan,
  // player walks) on the every-move re-renders where it isn't visible.
  if (!isGateOpen || (isSpectator && spectatorClosedRound === currentRound)) return null;

  const resolvedEvent = props.G.eventState.resolvedEvent;
  const summaryRound = props.G.round;

  const summaryItems: { icon: React.ReactNode; text: string }[] = [];

  if (resolvedEvent) {
    const def = EVENT_CARD_DEFS[resolvedEvent];
    summaryItems.push({
      icon: <GiTrumpetFlag style={{ fontSize: 20 }} />,
      text: `Event: ${def.displayName} \u2014 ${def.description}`,
    });
  } else {
    summaryItems.push({
      icon: <GiTrumpetFlag style={{ fontSize: 20 }} />,
      text: "No event was resolved this round",
    });
  }

  if (props.G.eventState.taxModifier !== 0) {
    const mod = props.G.eventState.taxModifier;
    summaryItems.push({
      icon: <AttachMoney />,
      text: mod > 0
        ? `Bumper Crops: +${mod} Gold to all taxes`
        : `Crops Fail: ${mod} Gold to all taxes`,
    });
  }
  if (props.G.eventState.skipTaxesNextRound) {
    summaryItems.push({
      icon: <AttachMoney />,
      text: "Taxes will be skipped next round (Peasant Rebellion)",
    });
  }

  // Trade income lines emitted by the engine during this round's resolution.
  const tradeLines = props.G.gameLog.filter(
    (e) => e.round === summaryRound && (e.message.startsWith("Trade routes:") || e.message.startsWith("Trade:"))
  );
  tradeLines.forEach((line) => {
    summaryItems.push({
      icon: <GiTwoCoins style={{ fontSize: 20 }} />,
      text: line.message,
    });
  });

  const mercyEntries = Object.entries(props.G.mercyGold ?? {});
  if (mercyEntries.length > 0) {
    const details = mercyEntries
      .map(([id, gold]) => `${props.G.playerInfo[id]?.kingdomName}: +${gold}`)
      .join(", ");
    summaryItems.push({
      icon: <GiTwoCoins style={{ fontSize: 20 }} />,
      text: `Mercy of the Republics — ${details}`,
    });
  }

  if (props.G.eventState.cannotConvertThisRound.length > 0) {
    const names = props.G.eventState.cannotConvertThisRound
      .map((id) => props.G.playerInfo[id]?.kingdomName)
      .join(", ");
    summaryItems.push({
      icon: <Shield />,
      text: `Rebellion forced conversion: ${names} cannot convert back`,
    });
  }

  const archprelate = Object.values(props.G.playerInfo).find((p) => p.isArchprelate);
  if (archprelate) {
    summaryItems.push({
      icon: <HowToVote />,
      text: `Archprelate: ${archprelate.kingdomName}`,
    });
  }

  if (props.G.accumulatedHosts.length > 0) {
    const totalSwords = props.G.accumulatedHosts.reduce((sum, h) => sum + h.swords, 0);
    summaryItems.push({
      icon: <Warning />,
      text: `Infidel Empire: ${props.G.accumulatedHosts.length} host(s) gathering (${totalSwords} total swords)`,
    });
  }

  if (props.G.eventState.peaceAccordActive) {
    summaryItems.push({
      icon: <Gavel />,
      text: "Peace Accord is active \u2014 first to attack loses 3 Victory Points",
    });
  }
  if (props.G.eventState.dynasticMarriage) {
    const [p1, p2] = props.G.eventState.dynasticMarriage;
    summaryItems.push({
      icon: <Gavel />,
      text: `Dynastic Marriage: ${props.G.playerInfo[p1].kingdomName} & ${props.G.playerInfo[p2].kingdomName}`,
    });
  }

  return (
    <DialogShell
      open
      title={`Round ${summaryRound} Summary`}
      subtitle={localPlayerAcked ? "Waiting for other players..." : undefined}
      mood="peacetime"
      size="sm"
      priority={DIALOG_PRIORITY.roundSummary}
      confirmLabel={isSpectator ? "Close" : "Continue"}
      confirmDisabled={!isSpectator && localPlayerAcked}
      onConfirm={() => {
        if (!props.playerID) {
          setSpectatorClosedRound(currentRound);
          return;
        }
        if (!localPlayerAcked) {
          props.moves.acknowledgeRoundSummary();
        }
      }}
    >
      {localPlayerAcked && pendingKingdoms.length > 0 && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Still waiting on: {pendingKingdoms.join(", ")}
        </Typography>
      )}
      <List dense>
        {summaryItems.map((item, idx) => (
          <div key={idx}>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
            {idx < summaryItems.length - 1 && (
              <Divider variant="inset" component="li" />
            )}
          </div>
        ))}
      </List>
    </DialogShell>
  );
};

export default RoundSummaryDialog;
