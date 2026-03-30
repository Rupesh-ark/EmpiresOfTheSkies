import { useState, useEffect } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from "@mui/material";
import {
  Gavel,
  AttachMoney,
  Shield,
  HowToVote,
  Warning,
} from "@mui/icons-material";
import { GiTrumpetFlag } from "react-icons/gi";
import { MyGameProps, EVENT_CARD_DEFS } from "@eots/game";

const RoundSummaryDialog = (props: MyGameProps) => {
  const [open, setOpen] = useState(false);
  const [lastRound, setLastRound] = useState(0);

  // Show the dialog when the round number changes (new round started)
  // Skip round 0 -> 1 (first round, nothing to summarize)
  useEffect(() => {
    if (props.G.round > 1 && props.G.round !== lastRound) {
      setLastRound(props.G.round);
      setOpen(true);
    }
  }, [props.G.round]);

  const resolvedEvent = props.G.eventState.resolvedEvent;
  const previousRound = props.G.round - 1;

  const summaryItems: { icon: React.ReactNode; text: string }[] = [];

  // Event
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

  // Tax modifier
  if (props.G.eventState.taxModifier !== 0) {
    const mod = props.G.eventState.taxModifier;
    summaryItems.push({
      icon: <AttachMoney />,
      text:
        mod > 0
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

  // Rebellion / battle events
  if (props.G.eventState.cannotConvertThisRound.length > 0) {
    const names = props.G.eventState.cannotConvertThisRound
      .map((id) => props.G.playerInfo[id]?.kingdomName)
      .join(", ");
    summaryItems.push({
      icon: <Shield />,
      text: `Rebellion forced conversion: ${names} cannot convert back`,
    });
  }

  // Election — show current Archprelate
  const archprelate = Object.values(props.G.playerInfo).find(
    (p) => p.isArchprelate
  );
  if (archprelate) {
    summaryItems.push({
      icon: <HowToVote />,
      text: `Archprelate: ${archprelate.kingdomName}`,
    });
  }

  // Infidel hosts
  if (props.G.accumulatedHosts.length > 0) {
    const totalSwords = props.G.accumulatedHosts.reduce(
      (sum, h) => sum + h.swords,
      0
    );
    summaryItems.push({
      icon: <Warning />,
      text: `Infidel Empire: ${props.G.accumulatedHosts.length} host(s) gathering (${totalSwords} total swords)`,
    });
  }

  // Active persistent effects
  if (props.G.eventState.peaceAccordActive) {
    summaryItems.push({
      icon: <Gavel />,
      text: "Peace Accord is active \u2014 first to attack loses 3 VP",
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
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Round {previousRound} Summary</DialogTitle>
      <DialogContent sx={{ p: 0 }}>
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
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpen(false)}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoundSummaryDialog;
