import { Box, Popper, Typography } from "@mui/material";
import { Close, MenuBook, Style } from "@mui/icons-material";
import { KingdomAdvantageCard } from "@eots/game";
import { alpha, darken } from "@mui/material/styles";
import { fonts } from "../../designTokens";
import svgNameToElementMap from "../WorldMap/nameToElementMap";
import { KA_CARD_IMAGES } from "../../assets/kingdomAdvantage";

const kingdomAdvantageCardArt: Partial<Record<KingdomAdvantageCard, string>> = KA_CARD_IMAGES;

const formatCardLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const controlSx = (background: string, open: boolean) =>
  ({
    display: "inline-flex",
    alignItems: "center",
    gap: 0.65,
    px: 1.1,
    py: 0.72,
    minHeight: 36,
    cursor: "pointer",
    borderRadius: 999,
    background,
    color: "white",
    userSelect: "none",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: open
      ? "0 3px 12px rgba(0,0,0,0.22)"
      : "0 1px 6px rgba(0,0,0,0.14)",
    "&:hover": {
      filter: "brightness(1.08)",
    },
  }) as const;

const panelSx = {
  px: 1.2,
  py: 1.1,
  border: "1px solid rgba(0,0,0,0.12)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,248,251,0.95) 100%)",
  display: "flex",
  justifyContent: "center",
  boxShadow: "0 10px 24px rgba(0,0,0,0.2)",
  overflow: "hidden",
} as const;

const HoldingControl = ({
  title,
  icon,
  background,
  open,
  onToggle,
}: {
  title: string;
  icon: JSX.Element;
  background: string;
  open: boolean;
  onToggle: () => void;
}) => (
  <Box onClick={onToggle} sx={controlSx(background, open)}>
    {icon}
    <Typography
      sx={{
        fontFamily: fonts.system,
        fontWeight: 800,
        fontSize: "0.82rem",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {title}
    </Typography>
    <Close
      sx={{
        fontSize: 15,
        opacity: 0.7,
        transform: open ? "rotate(0deg)" : "rotate(45deg)",
        transition: "transform 0.2s",
      }}
    />
  </Box>
);

const legacyBackground = (colour: string) =>
  `linear-gradient(90deg, ${darken(colour, 0.3)} 0%, ${darken(colour, 0.15)} 100%)`;

const advantageBackground = (colour: string) => {
  const accent = darken(colour, 0.4);
  return `linear-gradient(90deg, ${darken(accent, 0.15)} 0%, ${accent} 100%)`;
};

export const CardHoldingsInlineControls = ({
  colour,
  legacyCardOpen,
  advantageCardOpen,
  onToggleLegacy,
  onToggleAdvantage,
}: CardHoldingsInlineControlsProps) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
    <HoldingControl
      title="Legacy"
      icon={<MenuBook sx={{ fontSize: 17 }} />}
      background={legacyBackground(colour)}
      open={legacyCardOpen}
      onToggle={onToggleLegacy}
    />
    <HoldingControl
      title="Advantage"
      icon={<Style sx={{ fontSize: 17 }} />}
      background={advantageBackground(colour)}
      open={advantageCardOpen}
      onToggle={onToggleAdvantage}
    />
  </Box>
);

export const CardHoldingsPanels = ({
  anchorEl,
  colour,
  legacyCardName,
  advantageCard,
  legacyCardOpen,
  advantageCardOpen,
}: CardHoldingsPanelsProps) => {
  const open = legacyCardOpen || advantageCardOpen;
  const advantageAccent = darken(colour, 0.4);
  const advantageCardArt = advantageCard
    ? kingdomAdvantageCardArt[advantageCard]
    : undefined;
  const advantageCardLabel = advantageCard ? formatCardLabel(advantageCard) : "None claimed";

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="bottom"
      modifiers={[
        {
          name: "offset",
          options: { offset: [0, 10] },
        },
        {
          name: "preventOverflow",
          options: { padding: 12 },
        },
      ]}
      sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
    >
      <Box
        sx={{
          px: 1,
          py: 0.5,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 1,
          flexWrap: "wrap",
          maxWidth: "min(calc(100vw - 24px), 420px)",
        }}
      >
        {legacyCardOpen && (
          <Box sx={{ ...panelSx, minHeight: { xs: 226, sm: 282 } }}>
            <Box
              component="img"
              src={svgNameToElementMap[legacyCardName]}
              alt={formatCardLabel(legacyCardName)}
              sx={{
                width: { xs: 108, sm: 150 },
                height: { xs: 180, sm: 250 },
                objectFit: "contain",
              }}
            />
          </Box>
        )}
        {advantageCardOpen && (
          <Box sx={{ ...panelSx, minHeight: { xs: 226, sm: 282 } }}>
            {advantageCard ? (
              advantageCardArt ? (
                <Box
                  component="img"
                  src={advantageCardArt}
                  alt={advantageCardLabel}
                  sx={{
                    width: { xs: 108, sm: 150 },
                    height: { xs: 180, sm: 250 },
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: { xs: 108, sm: 150 },
                    minHeight: { xs: 180, sm: 214 },
                    px: 1.2,
                    py: 1.4,
                    borderRadius: 2,
                    border: `1px solid ${alpha(advantageAccent, 0.22)}`,
                    background:
                      `linear-gradient(180deg, ${alpha(
                        advantageAccent,
                        0.12
                      )} 0%, rgba(255,255,255,0.94) 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: fonts.system,
                      fontWeight: 800,
                      fontSize: "1rem",
                      lineHeight: 1.2,
                      color: "#1a2733",
                    }}
                  >
                    {advantageCardLabel}
                  </Typography>
                </Box>
              )
            ) : (
              <Box
                sx={{
                  minHeight: { xs: 180, sm: 214 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  px: 2,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: fonts.system,
                    fontSize: "0.86rem",
                    color: "rgba(0,0,0,0.6)",
                  }}
                >
                  No kingdom advantage card selected yet.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Popper>
  );
};

interface CardHoldingsInlineControlsProps {
  colour: string;
  legacyCardOpen: boolean;
  advantageCardOpen: boolean;
  onToggleLegacy: () => void;
  onToggleAdvantage: () => void;
}

interface CardHoldingsPanelsProps {
  anchorEl: HTMLElement | null;
  colour: string;
  legacyCardName: string;
  advantageCard?: KingdomAdvantageCard;
  legacyCardOpen: boolean;
  advantageCardOpen: boolean;
}
