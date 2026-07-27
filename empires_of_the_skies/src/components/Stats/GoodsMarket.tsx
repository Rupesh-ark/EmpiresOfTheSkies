/**
 * GoodsMarket — the commodity price track, drawn as a track.
 *
 * Reads `G.mapState.goodsPriceMarkers`, which IS the gold paid per cube:
 * `resolveRound` pays `goodsPriceMarkers[good] * quantity` directly. An
 * earlier abundance model recomputed prices from buildings on the map and
 * was superseded ("price marker lookup — replaces abundance functions",
 * resolveRound.ts); it also mis-indexed four of the six goods, so Magic Dust
 * showed Dragon Scales' supply and so on. Reading the marker is both correct
 * and the only source of truth.
 *
 * Ranking goods by what they currently fetch answers the one question this
 * panel exists for: what is worth selling right now.
 */
import { Box, Tooltip, Typography } from "@mui/material";
import { MyGameProps, GoodKey, PRICE_MARKER_MIN, PRICE_MARKER_MAX } from "@eots/game";
import { tokens } from "@/theme";

const LootIcon = ({ colour }: { colour: string }) => (
  <svg width="14" height="16" viewBox="0 0 28 31" fill="none" style={{ display: "block" }}>
    <path d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z" fill={colour} stroke="#1A1A18" strokeWidth="0.288" strokeMiterlimit="22.9256" />
    <path d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z" fill={colour} stroke="#1A1A18" strokeWidth="0.288" strokeMiterlimit="22.9256" />
    <path d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z" fill={colour} stroke="#1A1A18" strokeWidth="0.288" strokeMiterlimit="22.9256" />
  </svg>
);

const GOODS: { key: GoodKey; name: string; colour: string; borderColour: string }[] = [
  { key: "mithril",      name: "Mithril",       colour: "#ECEDED", borderColour: "#aaa" },
  { key: "magicDust",    name: "Magic Dust",    colour: "#F6B1B5", borderColour: "#c0485e" },
  { key: "dragonScales", name: "Dragon Scales", colour: "#52A6B2", borderColour: "#2e7a85" },
  { key: "krakenSkin",   name: "Kraken Skin",   colour: "#B1AC7E", borderColour: "#7a7550" },
  { key: "stickyIchor",  name: "Sticky Ichor",  colour: "#008BD2", borderColour: "#005f91" },
  { key: "pipeweed",     name: "Pipeweed",      colour: "#AE9675", borderColour: "#7a6650" },
];

/** Highest price first — the track reads top-down as best-to-worst. */
const TIERS = Array.from(
  { length: PRICE_MARKER_MAX - PRICE_MARKER_MIN + 1 },
  (_, i) => PRICE_MARKER_MAX - i
);

export const GoodsMarket = ({ props }: { props: MyGameProps }) => {
  const markers = props.G.mapState.goodsPriceMarkers;
  const held = props.playerID ? props.G.playerInfo[props.playerID]?.resources : undefined;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      {TIERS.map((tier) => {
        const here = GOODS.filter((g) => markers[g.key] === tier);
        return (
          <Box key={tier} sx={{ display: "flex", alignItems: "stretch", gap: `${tokens.spacing.sm}px`, minHeight: 30 }}>
            <Box
              sx={{
                width: 34,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: `${tokens.radius.sm}px`,
                border: `1px solid ${here.length ? `${tokens.ui.gold}66` : tokens.ui.border}`,
                backgroundColor: here.length ? `${tokens.ui.gold}14` : "transparent",
              }}
            >
              <Typography
                sx={{
                  fontFamily: tokens.font.display,
                  fontSize: 14,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: here.length ? tokens.ui.gold : tokens.ui.textMuted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {tier}g
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center", flex: 1, minWidth: 0 }}>
              {here.length === 0 ? (
                <Box sx={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${tokens.ui.border}, transparent)` }} />
              ) : (
                here.map((g) => {
                  const mine = held?.[g.key] ?? 0;
                  return (
                    <Tooltip
                      key={g.key}
                      title={mine > 0 ? `You hold ${mine} — worth ${mine * tier}g at Sell Goods` : `You hold none`}
                      placement="top"
                      arrow
                    >
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          px: "6px",
                          py: "3px",
                          borderRadius: `${tokens.radius.sm}px`,
                          border: `1px solid ${g.borderColour}`,
                          backgroundColor: tokens.ui.surfaceRaised,
                          opacity: mine > 0 ? 1 : 0.75,
                        }}
                      >
                        <LootIcon colour={g.colour} />
                        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 600, color: tokens.ui.text, lineHeight: 1 }}>
                          {g.name}
                        </Typography>
                        {mine > 0 && (
                          <Typography sx={{ fontFamily: tokens.font.body, fontSize: 10, fontWeight: 700, color: tokens.ui.gold, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                            ×{mine}
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
