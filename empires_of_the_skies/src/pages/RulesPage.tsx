/**
 * RulesPage — Standalone rules reference page for playtest walkthroughs.
 *
 * Layout: sticky sidebar TOC (left) + scrollable content (right).
 */
import { useRef, useState, useEffect } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ExpandMore,
  ArrowBack,
} from "@mui/icons-material";
import {
  GiWorld,
  GiSandsOfTime,
  GiCastle,
  GiScrollUnfurled,
  GiCompass,
  GiCrossedSwords,
  GiChurch,
  GiLightningStorm,
  GiLaurelsTrophy,
} from "react-icons/gi";
import { useNavigate } from "react-router-dom";

/* ─── Palette (matches Lobby) ─────────────────────────────────── */
const PAGE_BG    = "#151210";
const CREAM      = "#F5ECD8";
const CREAM_DIM  = "rgba(245,236,216,0.78)";
const GOLD       = "#E8C860";
const SURFACE    = "#1E1A16";
const SURFACE_RAISED = "#252019";
const BORDER     = "rgba(200,170,120,0.15)";
const DIVIDER    = "rgba(200,170,120,0.18)";
const CALLOUT_BG = "rgba(232,200,96,0.07)";
const CALLOUT_BORDER = "rgba(232,200,96,0.22)";
const MAX_CONTENT_W = "960px";

const fonts = {
  accent:  '"Cinzel", serif',
  display: "dauphinn",
  system:  '"Inter", system-ui, sans-serif',
};

/* ─── Section definitions ─────────────────────────────────────── */
interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  content: React.ReactNode;
}

/* ─── Reusable sub-components ─────────────────────────────────── */

const Callout = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      my: 2,
      p: 2,
      borderRadius: "8px",
      border: `1px solid ${CALLOUT_BORDER}`,
      backgroundColor: CALLOUT_BG,
    }}
  >
    {children}
  </Box>
);

const H3 = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      fontFamily: fonts.accent,
      fontSize: "clamp(1rem, 1.2vw, 1.12rem)",
      fontWeight: 700,
      color: GOLD,
      letterSpacing: "0.04em",
      mt: 3,
      mb: 1,
    }}
  >
    {children}
  </Typography>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      fontFamily: fonts.system,
      fontSize: "clamp(0.92rem, 1.05vw, 1rem)",
      lineHeight: 1.8,
      color: CREAM_DIM,
      mb: 1.25,
    }}
  >
    {children}
  </Typography>
);

const Bold = ({ children }: { children: React.ReactNode }) => (
  <Box component="span" sx={{ color: CREAM, fontWeight: 600 }}>
    {children}
  </Box>
);

const Gold = ({ children }: { children: React.ReactNode }) => (
  <Box component="span" sx={{ color: GOLD, fontWeight: 700 }}>
    {children}
  </Box>
);

const Li = ({ children }: { children: React.ReactNode }) => (
  <Box component="li" sx={{ mb: 0.75, fontFamily: fonts.system, fontSize: "clamp(0.92rem, 1.05vw, 1rem)", lineHeight: 1.8, color: CREAM_DIM }}>
    {children}
  </Box>
);

const Table = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <Box
    component="table"
    sx={{
      width: "100%",
      borderCollapse: "collapse",
      my: 1.5,
      "& th": {
        fontFamily: fonts.accent,
        fontSize: "0.9rem",
        color: GOLD,
        textAlign: "left",
        p: "8px 12px",
        borderBottom: `1px solid ${DIVIDER}`,
        fontWeight: 700,
        letterSpacing: "0.03em",
      },
      "& td": {
        fontFamily: fonts.system,
        fontSize: "0.92rem",
        color: CREAM_DIM,
        lineHeight: 1.6,
        p: "7px 12px",
        borderBottom: `1px solid ${DIVIDER}`,
      },
      "& tr:last-child td": { borderBottom: "none" },
    }}
  >
    <thead>
      <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
      ))}
    </tbody>
  </Box>
);

const FlowStep = ({ num, label, desc }: { num: number; label: string; desc: string }) => (
  <Box sx={{ display: "flex", gap: 2, mb: 1.5, alignItems: "flex-start" }}>
    <Box
      sx={{
        flexShrink: 0,
        width: 32,
        height: 32,
        borderRadius: "50%",
        backgroundColor: "rgba(232,200,96,0.15)",
        border: `1px solid ${CALLOUT_BORDER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fonts.accent,
        fontSize: "0.9rem",
        fontWeight: 800,
        color: GOLD,
      }}
    >
      {num}
    </Box>
    <Box>
      <Typography sx={{ fontFamily: fonts.accent, fontSize: "1rem", fontWeight: 700, color: CREAM, lineHeight: 1.4 }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: fonts.system, fontSize: "0.92rem", color: CREAM_DIM, lineHeight: 1.7 }}>
        {desc}
      </Typography>
    </Box>
  </Box>
);

/* ─── Section content ─────────────────────────────────────────── */

const WorldSection = () => (
  <>
    <P>
      You are the <Bold>Monarch</Bold> of one of six kingdoms in <Bold>Faithdom</Bold> — a land hemmed in by icy wastes, mountains,
      the hostile Infidel Empire, and the stormy Ocean Sea. Alchemists have discovered the secret of flight, and bold
      aviators are venturing beyond in <Bold>skyships</Bold> to discover new lands filled with strange beings and fabulous wealth.
    </P>
    <P>
      Purchase skyships, send fleets to claim outposts, conquer distant lands, and use their riches to build the greatest
      empire. Control the Church, crush or embrace heresy, and leave behind a formidable legacy when your reign ends.
    </P>
    <Callout>
      <P>
        <Gold>Goal:</Gold> Over <Bold>6–8 rounds</Bold>, earn the most <Bold>Victory Points</Bold> through
        trade, conquest, buildings, church influence, and your secret legacy card.
      </P>
    </Callout>
    <H3>The Six Kingdoms</H3>
    <P>
      Each player takes one kingdom (Angland, Constantium, Nordmark, Gallois, Castillia, or Ostreich).
      All start equal — same gold, troops, and buildings. Your <Bold>Kingdom Advantage</Bold> card, chosen at setup,
      gives you a unique permanent ability that shapes your strategy.
    </P>
    <H3>The Map</H3>
    <P>
      Faithdom sits at the centre. Surrounding it are face-down map tiles — lands inhabited by fantasy races
      (Dwarves, Elves, Goblins, Halflings, Orcs, Trolls), legendary locations (City of Gold, Fountain of Youth),
      and oceans. You'll discover these as the game unfolds.
    </P>
  </>
);

const RoundFlowSection = () => (
  <>
    <P>
      Every round follows the same <Bold>7 phases</Bold> in order. Each phase is quick except Actions (the main decision phase).
    </P>
    <Box sx={{ my: 2 }}>
      <FlowStep num={1} label="Events" desc="One random event card is revealed — rebellions, plagues, bumper crops, marriages. These shake up the round." />
      <FlowStep num={2} label="Discoveries" desc="Each player may flip one hidden map tile to reveal new lands, oceans, or legends. Chain-flip oceans and legends until land appears." />
      <FlowStep num={3} label="Taxes" desc="Collect gold from the bank based on your player order position. Earlier positions get less gold." />
      <FlowStep num={4} label="Actions" desc="The main phase. Take turns placing counsellors on the action board to recruit troops, buy skyships, build, explore, and more." />
      <FlowStep num={5} label="Resolution" desc="Battles are fought, trade routes generate income, goods are sold, piracy occurs, and the Archprelate is elected." />
      <FlowStep num={6} label="Scoring" desc="Earn VP from trade gains, heresy track position, palace majority, and legacy card (final round)." />
      <FlowStep num={7} label="Reset" desc="Update player order, retrieve counsellors, advance the round marker." />
    </Box>
    <Callout>
      <P>
        <Gold>Key rhythm:</Gold> Events and Discoveries happen <Bold>to</Bold> you. Actions is where <Bold>you</Bold> make
        choices. Resolution is where those choices <Bold>play out</Bold>.
      </P>
    </Callout>
  </>
);

const KingdomSection = () => (
  <>
    <H3>Starting Resources</H3>
    <P>Every player begins each game with:</P>
    <Box component="ul" sx={{ pl: 2.5, mb: 1 }}>
      <Li><Gold>6 Gold</Gold> — your treasury, spent on almost everything</Li>
      <Li><Gold>4 Counsellors</Gold> — placed on the action board to take actions (max 7)</Li>
      <Li><Gold>3 Skyships</Gold> — form fleets, establish trade routes (max 24)</Li>
      <Li><Gold>6 Regiments</Gold> — your ground troops, 2 Swords each (max 30)</Li>
      <Li><Gold>1 each:</Gold> Factory, Cathedral, Palace (starting buildings)</Li>
    </Box>

    <H3>Kingdom Advantage Cards</H3>
    <P>
      At setup, each player picks one of these unique abilities. It lasts the whole game.
      Cards are organised into <Bold>rivalry pairs</Bold> — if one is in the game, its counterpart is too:
    </P>
    <Table
      headers={["Pair", "Card", "Effect"]}
      rows={[
        ["Economic", "Licenced Smugglers", "+1 free Goods cube of your choice each trade phase"],
        ["Economic", "Sanctioned Piracy", "+1 VP per trade route your fleets pirate"],
        ["Military", "Elite Regiments", "Replace 3 Regiments with Elite ones (3 Swords each)"],
        ["Military", "Improved Training", "+1 Sword or Shield per Fortunes of War card from hand"],
        ["Religious", "Patriarch of the Church", "+1 vote in every Archprelate election"],
        ["Religious", "More Prisons", "4 prison spaces instead of 3"],
        ["Wild", "More Efficient Taxation", "+2 Gold each Taxes phase"],
      ]}
    />

    <H3>Gold & Debt</H3>
    <P>
      If an action costs more gold than you have, you <Bold>must take debt</Bold>. Place gold cubes
      in your debt space. Any future gold income goes to clearing debt first. At scoring,
      you lose <Gold>-1 VP per 2 Gold</Gold> of debt.
    </P>

    <H3>Fleets</H3>
    <P>
      Fleets are how you project power. Each fleet can hold up to <Bold>5 skyships</Bold>, each carrying
      1 regiment or levy. You can have up to <Bold>3 active fleets</Bold>. Fleets move up to
      4 squares per dispatch, costing <Gold>1 Gold per square</Gold>. Laden fleets cannot cross mountains.
    </P>
  </>
);

const ActionsSection = () => (
  <>
    <P>
      Players take turns placing counsellors (one at a time, in player order) on action slots.
      Each placement commits you to that action and its cost. You may place up to <Bold>7 counsellors</Bold> per round.
    </P>

    <H3>Action Board (Shared)</H3>
    <P>
      Slots on the action board cost more as they fill up — the earlier you act, the cheaper it is.
    </P>
    <Table
      headers={["Action", "Base Cost", "What It Does"]}
      rows={[
        ["Change Player Order", "1 Counsellor", "Claim a new turn-order position (takes effect at Reset)"],
        ["Recruit Counsellors", "1G + row cost", "Gain 1 extra counsellor (more actions per round)"],
        ["Recruit Regiments", "1G + row cost", "Gain 4 regiments to your kingdom"],
        ["Purchase Skyships", "2G + row cost", "Buy 2 skyships from Zeeland or Venoa shipyards"],
        ["Found Factories", "1G + row cost", "Build a factory (generates trade income)"],
        ["Found Cathedrals", "5G + row cost", "+2 VP, -1 heresy, +1 election vote. Heretics cannot build."],
        ["Found Palaces", "5G + row cost", "+1 VP (Orthodox) or +2 VP (Heretic), heresy ±1 your choice"],
        ["Found Shipyards", "3G + row cost", "Build skyships independently via kingdom action"],
        ["Found Forts", "2G + row cost", "Defensive bonus in ground battles (+1 Shield per unit)"],
        ["Influence Prelates", "Free/1G/varies", "Place counsellors on prelate slots to control the election"],
        ["Issue Holy Decree", "Free (Archprelate)", "Bless, Curse, Reform Dogma, or Confirm Dogma"],
      ]}
    />
    <Callout>
      <P>
        <Gold>Row cost:</Gold> Each action row gets more expensive as counsellors pile in.
        The cost increases by <Bold>+1 Gold</Bold> for each counsellor already placed in that row (including yours).
      </P>
    </Callout>

    <H3>Kingdom Board (Personal)</H3>
    <P>These actions are taken on your own board, not the shared one:</P>
    <Table
      headers={["Action", "Cost", "What It Does"]}
      rows={[
        ["Deploy Fleet", "Free", "Move a fleet model from its box to your kingdom"],
        ["Build Skyships", "1G each", "Build 1-2 skyships per Shipyard you own (once/round)"],
        ["Conscript Levies", "1 VP per 3", "Raise cheap troops (1 Sword each, half-strength)"],
        ["Train Troops", "1 Counsellor", "Draw 2 Fortunes of War cards into your hand"],
        ["Dispatch Fleet", "1G per square", "Send a fleet up to 4 squares, load/unload troops en route"],
        ["Punish Dissenters", "2G or 1 Counsellor", "Imprison or execute to shift heresy track (once/round)"],
        ["Convert Monarch", "2G + 1 Counsellor", "Flip between Orthodox and Heretic (releases all prisoners)"],
      ]}
    />
  </>
);

const ExplorationSection = () => (
  <>
    <H3>Discovery</H3>
    <P>
      Each round during the Discovery phase, you may flip one face-down tile adjacent to the known world.
      If it's an <Bold>ocean or legend</Bold>, keep flipping connected tiles until a land appears.
      Discovering a <Bold>new race or legend</Bold> advances <Bold>all players'</Bold> heresy tracks by 1.
    </P>

    <H3>Claiming Lands</H3>
    <P>
      When your fleet is the only one on an unclaimed land, you may <Bold>claim</Bold> it:
    </P>
    <Box component="ul" sx={{ pl: 2.5, mb: 1 }}>
      <Li>Place an <Bold>Outpost</Bold> counter with your skyship on top — <Gold>+1 VP</Gold></Li>
      <Li>Your heresy track advances 1 space</Li>
      <Li>You may garrison regiments/levies to defend it</Li>
    </Box>

    <H3>Conquest (Upgrading to Colony)</H3>
    <P>
      To turn an outpost into a colony, you must defeat the land's printed defences in battle.
      Colonies unlock <Bold>all trade gains</Bold> from that land (outposts only get the top row).
      Failed conquests <Bold>destroy your outpost</Bold> and any fort.
    </P>

    <H3>Trade Routes</H3>
    <P>
      To earn income from a claimed land, trace a <Bold>contiguous chain of your skyships</Bold> from
      the land back to Faithdom (edge-to-edge or diagonally). This is your <Bold>trade route</Bold>.
      No skyship is placed on Faithdom itself. Mountains block routes.
    </P>
    <Callout>
      <P>
        <Gold>Trade income:</Gold> During Resolution, you collect gold and goods from all lands connected
        by trade routes. Goods are sold at market prices that <Bold>fluctuate</Bold> based on supply —
        more colonies producing the same good means lower prices.
      </P>
    </Callout>

    <H3>Factory Income</H3>
    <P>
      During Resolution, a gold pool equal to the total number of outposts and colonies is created.
      The player with the most factories draws first (gold equal to their factory count), then the next, and so on
      until the pool is empty. However, your effective factory count is <Bold>capped at your number
      of active trade routes</Bold> — factories without trade routes to feed them produce nothing.
    </P>

    <H3>Piracy</H3>
    <P>
      If a rival's fleet sits on your trade route and you can't trace an alternate path,
      you pay them <Bold>1 Gold per route</Bold>. Your own fleet in that square can protect against
      piracy — but a fleet can either pirate or protect, <Bold>not both</Bold>.
    </P>
    <P>
      Instead of collecting gold, a pirating fleet can choose to <Bold>cut the route</Bold> — remove
      one rival trade route skyship from that square. No gold is gained, but the rival loses
      their connection. You can mix strategies: collect from one route, cut another.
    </P>
    <P>
      The <Bold>Infidel Fleet</Bold>, if drawn, also acts as a pirate on any route through its square (gold goes to the bank).
    </P>
  </>
);

const CombatSection = () => (
  <>
    <P>
      All battles are a <Bold>simultaneous exchange</Bold> — both sides deal and receive damage at the same time.
      Each side adds up Swords (attack) and Shields (defence), plays a Fortunes of War card, then resolves:
    </P>
    <Callout>
      <P>
        <Gold>Hits dealt</Gold> = Your Swords - Opponent's Shields<br />
        <Gold>Strength</Gold> = Your base Swords total (capacity to absorb hits)
      </P>
    </Callout>

    <H3>Combat Values</H3>
    <Table
      headers={["Unit", "Swords", "Shields", "Absorbs"]}
      rows={[
        ["Regiment", "2", "0", "2 hits"],
        ["Elite Regiment", "3", "0", "2 hits"],
        ["Levy", "1", "0", "1 hit"],
        ["Skyship", "1", "1", "1 hit"],
        ["Fort", "0", "1 per ground unit", "—"],
      ]}
    />

    <H3>Aerial Battles</H3>
    <P>
      When rival fleets share a map square, the attacker (in player order) picks a target.
      The defender can <Bold>fight or evade</Bold>. If they evade, the attacker picks where they go.
      If they fight, the loser <Bold>retreats</Bold> to a square chosen by the winner.
      The winner gains <Gold>+1 VP</Gold>.
    </P>

    <H3>Ground Battles</H3>
    <P>
      To attack a rival's garrisoned outpost/colony, no other rival fleet may be present.
      The attacker must <Bold>completely eliminate</Bold> all defenders to win.
      The attacker may offer the defender the option to <Bold>Yield</Bold> — troops return home peacefully,
      but the outpost/colony is left undefended.
    </P>

    <H3>Conquest Attempts</H3>
    <P>
      Like a ground battle, but against the land's <Bold>printed defences</Bold> (Swords + Shields on the tile).
      The land always draws a Fortunes of War card from the deck. To win: your hits must meet or exceed
      the land's strength, and at least part of your fleet must survive.
    </P>
    <Box component="ul" sx={{ pl: 2.5, mb: 1 }}>
      <Li><Bold>Success:</Bold> Place Colony, <Gold>+1 VP</Gold>, land defences removed</Li>
      <Li><Bold>Failure:</Bold> Outpost destroyed, fort removed, stranded troops lost</Li>
    </Box>

    <H3>Fortunes of War Cards</H3>
    <P>
      32 cards: 15 award 1-5 extra Swords, 15 award 1-5 extra Shields, 2 are "No Effect".
      You can hold up to <Bold>4 cards</Bold> in hand (gained via Train Troops action).
      Playing from hand lets you <Bold>choose</Bold> which card to use — otherwise you draw blindly from the deck.
    </P>
  </>
);

const ChurchSection = () => (
  <>
    <H3>The Heresy Track</H3>
    <P>
      Each kingdom has a 19-space heresy track. Your marker starts at space 1 (Orthodox side up).
      As discoveries challenge Church doctrine, heresy rises. Your marker position + religious alignment
      determines how many <Bold>VP you score each round</Bold> from the track.
    </P>
    <Callout>
      <P>
        <Gold>Orthodox</Gold> (purple): Earn VP from the purple number at your marker position. Generally rewards staying low on the track.<br />
        <Gold>Heretic</Gold> (orange): Earn VP from the orange number. Generally rewards advancing further.
      </P>
    </Callout>

    <H3>What Moves the Heresy Track</H3>
    <Table
      headers={["Advances (+)", "Retreats (-)"]}
      rows={[
        ["Discover legend or new race (all players)", "Found Cathedral (-1)"],
        ["Claim a land (+1)", "Win Archprelate election (-1)"],
        ["Plunder a legend (+1)", "Reform Dogma decree (all, -1)"],
        ["Confirm Dogma decree (all, +1)", "Punish heretics (Orthodox)"],
        ["Punish believers (Heretic)", "Found Palace (player choice ±1)"],
        ["Found Palace (player choice ±1)", ""],
      ]}
    />

    <H3>Punishing Dissenters</H3>
    <P>
      Once per round, pay <Bold>2 Gold or 1 Counsellor</Bold> to imprison or execute dissenters:
    </P>
    <Box component="ul" sx={{ pl: 2.5, mb: 1 }}>
      <Li><Bold>Imprison:</Bold> Place cubes in prison (max 3, or 4 with More Prisons). Each shifts heresy by 1.</Li>
      <Li><Bold>Execute:</Bold> Remove imprisoned cubes. Each shifts heresy by 1 but costs <Gold>-1 VP</Gold>.</Li>
    </Box>

    <H3>Converting Your Monarch</H3>
    <P>
      For <Bold>2 Gold + 1 Counsellor</Bold>, flip your heresy marker between Orthodox and Heretic.
      All imprisoned dissenters are <Bold>immediately released</Bold>, reversing their heresy shifts.
      This changes which VP values you read from the track and whether you can build cathedrals.
    </P>

    <H3>Archprelate Election</H3>
    <P>
      During Resolution, players vote for the Archprelate using Council of Prelates slots.
      Each kingdom gets votes equal to its <Bold>number of cathedrals</Bold>. You can influence
      other kingdoms' prelates during the Actions phase.
    </P>
    <P>
      The winner gains VP equal to <Gold>2 x Orthodox Realms / 3</Gold> (max 6 VP), and retreats their heresy marker by 1.
      Ties go to the incumbent.
    </P>

    <H3>Holy Decrees (Archprelate Only)</H3>
    <P>The Archprelate may issue one decree per round:</P>
    <Box component="ul" sx={{ pl: 2.5, mb: 1 }}>
      <Li><Bold>Bless</Bold> — Award VP to the least-heretical Orthodox monarch</Li>
      <Li><Bold>Curse</Bold> — Deduct VP from a heretic (or the most-heretical Orthodox if no heretics)</Li>
      <Li><Bold>Reform Dogma</Bold> — All heresy markers retreat 1 space</Li>
      <Li><Bold>Confirm Dogma</Bold> — All heresy markers advance 1 space</Li>
    </Box>
  </>
);

const EventsSection = () => (
  <>
    <H3>How Events Work</H3>
    <P>
      Each round, every player submits one event card face-down from their hand of three.
      Cards are shuffled and one is drawn. If it would have no effect, draw another.
      After resolving, each player draws a new card to refill their hand.
    </P>
    <P>
      The event deck is split into two halves. During <Bold>rounds 1–2</Bold>, only cards that make sense
      early (no colonies or outposts required) are in play. At the <Bold>start of round 3</Bold>, the remaining
      cards are shuffled in — so events get more dramatic as the game progresses.
    </P>
    <Callout>
      <P>
        <Gold>Strategy:</Gold> You choose which card to submit! Play cards that benefit you or
        hurt your rivals. Cards marked "VOID IF..." are skipped if their condition isn't met.
      </P>
    </Callout>

    <H3>Event Types</H3>
    <Box component="ul" sx={{ pl: 2.5, mb: 1 }}>
      <Li><Bold>Economic:</Bold> Bumper Crops (+3G all), Crops Fail (-3G all), Patrons of the Arts (+1 VP per cathedral & palace), Guild Revolt (pay 2G per factory or sell one), Corruption Scandal (lose a cathedral or -3 VP)</Li>
      <Li><Bold>Religious:</Bold> Prelacy Condemned (+4 heresy all), Defence of the Faith (-4 heresy all), Kingdom/Republic Turns Heretic</Li>
      <Li><Bold>Military:</Bold> Infidel Corsairs Raid (lose half gold if undefended), Faerie Uprising, Headstrong Commander</Li>
      <Li><Bold>Rebellions:</Bold> Heretic, Orthodox, Peasant, Pretender, Colonial — internal battles that rival players can join</Li>
      <Li><Bold>Diplomatic:</Bold> Peace Accord (-3 VP to first attacker), Dynastic Marriage (+3 VP mutual alliance)</Li>
      <Li><Bold>Competitive:</Bold> Royal Patronage (+2 VP & 2G to first land claimer), Race to Discovery (+1 VP per tile lead), Foreign Agitators (players place dissenters in each other's kingdoms)</Li>
    </Box>

    <H3>Rebellions</H3>
    <P>
      When a rebellion event fires, a Rebels counter is drawn (random strength).
      The targeted player can fight or yield. Other players may send up to <Bold>3 units</Bold> to either side.
      Rebels must eliminate all defenders to win. Consequences vary by rebellion type —
      conversion, lost legacy cards, lost taxes, etc.
    </P>

    <H3>Infidel Invasions</H3>
    <P>
      Each round during Resolution, one Infidel Host counter is drawn. If it has the "attack" arrow,
      <Bold>all players</Bold> must raise the Grand Army of the Faith:
    </P>
    <Box component="ul" sx={{ pl: 2.5, mb: 1 }}>
      <Li>The Archprelate names a <Bold>Captain-General</Bold> (cannot refuse)</Li>
      <Li>Each player commits regiments/levies/fleets</Li>
      <Li>Contributing nothing earns a <Bold>heresy penalty</Bold></Li>
      <Li><Bold>Win:</Bold> Captain-General +3 VP, largest force +5 VP, 2nd largest +2 VP</Li>
      <Li><Bold>Lose:</Bold> Must buy off the Infidels with gold, or lose VP one at a time</Li>
    </Box>
  </>
);

const ScoringSection = () => (
  <>
    <H3>VP Each Round</H3>
    <P>At the end of every round, score from these sources:</P>

    <Table
      headers={["Source", "VP"]}
      rows={[
        ["Trade Gains (1st/2nd/3rd most)", "Scales by round: 3/2/1 → 6/4/2 → 9/6/3 → 12/8/4"],
        ["Heresy Track Position", "Read purple (Orthodox) or orange (Heretic) number at your marker"],
        ["Palace Majority", "Most palaces scores: your palaces - 2nd most palaces"],
        ["Debt Penalty", "-1 VP per 2 Gold of debt"],
      ]}
    />

    <H3>During the Game</H3>
    <P>Many actions also award or cost VP immediately:</P>
    <Table
      headers={["Action", "VP"]}
      rows={[
        ["Found Cathedral", "+2"],
        ["Found Palace", "+1 (Orthodox) or +2 (Heretic)"],
        ["Claim a Land", "+1"],
        ["Win Aerial Battle", "+1"],
        ["Win Ground Battle", "+1"],
        ["Successful Conquest", "+1"],
        ["Win Archprelate Election", "Up to +6 (based on Orthodox realm count)"],
        ["Execute a Dissenter", "-1 each"],
        ["Conscript Levies", "-1 per 3 levies"],
      ]}
    />

    <H3>Final Round Bonuses</H3>
    <Box component="ul" sx={{ pl: 2.5, mb: 1 }}>
      <Li><Bold>Legacy Card:</Bold> Your secret goal — scores based on what you've built (colonies, buildings, military, etc.). Full VP if your alignment matches the card colour; <Gold>half VP</Gold> if mismatched.</Li>
      <Li><Bold>Leftover Gold:</Bold> +1 VP per 5 Gold remaining</Li>
    </Box>

    <H3>Legacy Cards</H3>
    <P>
      At setup, you're dealt 3 legacy cards from different archetypes (Colonial, Religious, Generalist) — each
      coloured purple (Orthodox) or orange (Heretic). Pick one secretly. The deal is structured so that if someone
      gets a strong combo with their Kingdom Advantage, a counter-combo exists elsewhere.
    </P>
    <Table
      headers={["Title", "Scores For"]}
      rows={[
        ["The Aviator", "+1 VP per Skyship"],
        ["The Merchant", "+1 VP per Trade Gain in routes"],
        ["The Magnificent", "+4 VP per Palace"],
        ["The Pious", "+4 VP per Cathedral"],
        ["The Conqueror", "+6 VP per Colony"],
        ["The Mighty", "+1 VP per fleet Skyship, Fort, and per 3 Regiments"],
        ["The Great", "+4 VP for leading in each category (Skyships, Regiments, etc.)"],
        ["The Builder", "+2 VP per Cathedral, Palace, Shipyard, and Fort"],
        ["The Navigator", "+4 VP per Outpost and Colony"],
      ]}
    />

    <Callout>
      <P>
        <Gold>Tip:</Gold> Your legacy card should guide your overall strategy. If you drew "The Conqueror",
        invest in military and conquer lands. If you drew "The Pious", build cathedrals and control the Church.
        But remember — your alignment must match the card colour for full VP!
      </P>
    </Callout>
  </>
);

/* ─── Sections array ──────────────────────────────────────────── */

const SECTIONS: Section[] = [
  { id: "world",       title: "The World",           icon: GiWorld,            content: <WorldSection /> },
  { id: "round-flow",  title: "Round Flow",          icon: GiSandsOfTime,      content: <RoundFlowSection /> },
  { id: "kingdom",     title: "Your Kingdom",        icon: GiCastle,           content: <KingdomSection /> },
  { id: "actions",     title: "Actions Phase",       icon: GiScrollUnfurled,   content: <ActionsSection /> },
  { id: "exploration", title: "Exploration & Trade",  icon: GiCompass,          content: <ExplorationSection /> },
  { id: "combat",      title: "Combat",              icon: GiCrossedSwords,    content: <CombatSection /> },
  { id: "church",      title: "The Church",          icon: GiChurch,           content: <ChurchSection /> },
  { id: "events",      title: "Events & Crises",     icon: GiLightningStorm,   content: <EventsSection /> },
  { id: "scoring",     title: "Scoring & Victory",   icon: GiLaurelsTrophy,    content: <ScoringSection /> },
];

/* ─── Main component ──────────────────────────────────────────── */

const RulesPage = () => {
  const navigate = useNavigate();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map((s) => [s.id, true]))
  );

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      // Expand the section if collapsed
      setExpanded((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };

  // Track active section via intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute("data-section") ?? "");
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      sx={{
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
        backgroundColor: PAGE_BG,
        display: "flex",
        boxSizing: "border-box",
      }}
    >
      {/* ── Sidebar TOC ──────────────────────────────────────── */}
      <Box
        sx={{
          flexShrink: 0,
          width: { xs: "56px", md: "220px" },
          display: "flex",
          flexDirection: "column",
          backgroundColor: SURFACE,
          borderRight: `1px solid ${BORDER}`,
          overflowY: "auto",
          py: 2,
        }}
      >
        {/* Back button */}
        <Box sx={{ px: { xs: 0.5, md: 2 }, mb: 2, display: "flex", justifyContent: { xs: "center", md: "flex-start" } }}>
          <Tooltip title="Back to Home">
            <IconButton
              size="small"
              onClick={() => navigate("/")}
              sx={{ color: CREAM_DIM, "&:hover": { color: GOLD } }}
            >
              <ArrowBack fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Title (desktop only) */}
        <Typography
          sx={{
            display: { xs: "none", md: "block" },
            fontFamily: fonts.accent,
            fontSize: "0.92rem",
            fontWeight: 800,
            color: GOLD,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            px: 2,
            mb: 2,
          }}
        >
          Rules Guide
        </Typography>

        {/* TOC items */}
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <Box
              key={section.id}
              onClick={() => scrollTo(section.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: { xs: 0, md: 2 },
                py: 1,
                cursor: "pointer",
                justifyContent: { xs: "center", md: "flex-start" },
                backgroundColor: isActive ? "rgba(232,200,96,0.1)" : "transparent",
                borderLeft: isActive ? `3px solid ${GOLD}` : "3px solid transparent",
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: "rgba(232,200,96,0.06)",
                },
              }}
            >
              <Tooltip title={section.title} placement="right">
                <Box sx={{ display: "flex", color: isActive ? GOLD : CREAM_DIM }}>
                  <Icon size={18} />
                </Box>
              </Tooltip>
              <Typography
                sx={{
                  display: { xs: "none", md: "block" },
                  fontFamily: fonts.system,
                  fontSize: "0.9rem",
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? CREAM : CREAM_DIM,
                  whiteSpace: "nowrap",
                }}
              >
                {section.title}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* ── Main content ─────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: { xs: 1.5, md: 3, lg: 4 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Header — compact inline bar */}
        <Box
          sx={{
            width: "100%",
            maxWidth: MAX_CONTENT_W,
            backgroundColor: SURFACE,
            borderRadius: "8px",
            border: `1px solid ${BORDER}`,
            px: { xs: 2, md: 3 },
            py: 1.5,
            mb: 2.5,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Typography
            sx={{
              fontFamily: fonts.accent,
              fontSize: "clamp(1.1rem, 1.6vw, 1.4rem)",
              fontWeight: 800,
              color: GOLD,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Empires of the Sky
          </Typography>
          <Typography
            sx={{
              fontFamily: fonts.system,
              fontSize: "0.9rem",
              color: CREAM_DIM,
              fontStyle: "italic",
            }}
          >
            Rules Guide
          </Typography>
        </Box>

        {/* Sections */}
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Box
              key={section.id}
              ref={(el: HTMLDivElement | null) => { sectionRefs.current[section.id] = el; }}
              data-section={section.id}
              sx={{ mb: 2, width: "100%", maxWidth: MAX_CONTENT_W }}
            >
              <Accordion
                expanded={expanded[section.id] ?? true}
                onChange={(_, isExpanded) =>
                  setExpanded((prev) => ({ ...prev, [section.id]: isExpanded }))
                }
                sx={{
                  backgroundColor: SURFACE_RAISED,
                  borderRadius: "8px !important",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "none",
                  "&:before": { display: "none" },
                  "& .MuiAccordionSummary-root": {
                    minHeight: 52,
                    px: { xs: 2, md: 3 },
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore sx={{ color: CREAM_DIM }} />}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ color: GOLD, display: "flex" }}>
                      <Icon size={22} />
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: fonts.accent,
                        fontSize: "clamp(1.05rem, 1.3vw, 1.2rem)",
                        fontWeight: 700,
                        color: CREAM,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {section.title}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, px: { xs: 2, md: 3 }, pb: 3 }}>
                  <Box sx={{ height: "1px", background: DIVIDER, mb: 2.5 }} />
                  {section.content}
                </AccordionDetails>
              </Accordion>
            </Box>
          );
        })}

        {/* Footer */}
        <Typography
          sx={{
            fontFamily: fonts.system,
            fontSize: "0.75rem",
            color: CREAM_DIM,
            textAlign: "center",
            mt: 3,
            mb: 2,
            opacity: 0.6,
          }}
        >
          Based on Empires of the Sky Rulebook v4.2 &mdash; &copy; NF MacCormack 2023
        </Typography>
      </Box>
    </Box>
  );
};

export default RulesPage;
