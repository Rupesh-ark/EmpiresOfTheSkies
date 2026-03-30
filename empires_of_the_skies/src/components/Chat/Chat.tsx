import * as React from "react";
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Avatar,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { MyGameProps } from "@eots/game";
import { ChatMessage } from "boardgame.io";
import { ChangeEventHandler } from "react";
import { tokens } from "@/theme";

const Chat = (props: MyGameProps) => {
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const allegiance = props.playerID ? props.G.playerInfo[props.playerID]?.hereticOrOrthodox : undefined;
  const accentColor = allegiance === "heretic" ? tokens.allegiance.heresy : tokens.allegiance.orthodox;

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.chatMessages]);

  const handleSend = () => {
    if (input.trim() !== "") {
      props.sendChatMessage(input);
      setInput("");
    }
  };

  const handleInputChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (event) => {
    setInput(event.target.value);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Accent top edge */}
      <Box
        sx={{
          height: 2,
          flexShrink: 0,
          backgroundColor: `${tokens.ui.gold}44`,
        }}
      />

      {/* Messages */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          backgroundColor: tokens.ui.background,
        }}
      >
        {props.chatMessages.length === 0 && (
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.xs,
              color: tokens.ui.textMuted,
              textAlign: "center",
              mt: 4,
              fontStyle: "italic",
            }}
          >
            No messages yet. Say something!
          </Typography>
        )}
        {props.chatMessages.map((message) => (
          <Message key={message.id} message={message} {...props} />
        ))}
        <div ref={bottomRef} />
      </Box>

      {/* Input bar */}
      <Box
        sx={{
          px: 2,
          py: 1,
          flexShrink: 0,
          backgroundColor: tokens.ui.surface,
          borderTop: `1px solid ${tokens.ui.border}`,
          display: "flex",
          gap: 1,
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder="Type a message..."
          variant="outlined"
          value={input}
          onChange={handleInputChange}
          onKeyDownCapture={(event) => {
            if (event.key === "Enter") handleSend();
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: `${tokens.radius.md}px`,
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.sm,
              color: tokens.ui.text,
              backgroundColor: tokens.ui.surfaceRaised,
              "& fieldset": {
                borderColor: tokens.ui.border,
              },
              "&:hover fieldset": {
                borderColor: tokens.ui.borderMedium,
              },
              "&.Mui-focused fieldset": {
                borderColor: accentColor,
                borderWidth: 1,
              },
            },
            "& .MuiInputBase-input::placeholder": {
              color: tokens.ui.textMuted,
              opacity: 1,
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!input.trim()}
          sx={{
            backgroundColor: tokens.ui.surfaceRaised,
            color: tokens.ui.gold,
            border: `1px solid ${tokens.ui.border}`,
            "&:hover": {
              backgroundColor: tokens.ui.surfaceHover,
              borderColor: tokens.ui.gold,
            },
            "&.Mui-disabled": {
              backgroundColor: tokens.ui.surface,
              color: tokens.ui.textMuted,
              borderColor: tokens.ui.border,
            },
            borderRadius: `${tokens.radius.md}px`,
            width: 36,
            height: 36,
            flexShrink: 0,
          }}
        >
          <SendIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

const Message = (props: MessageProps) => {
  const isMine = props.message.sender === props.playerID;
  const playerInfo = props.G.playerInfo[props.message.sender];
  const allegiance = playerInfo?.hereticOrOrthodox;
  const allegianceColor = allegiance === "heretic" ? tokens.allegiance.heresy : tokens.allegiance.orthodox;
  const senderName =
    props.matchData?.find((p) => String(p.id) === props.message.sender)?.name ??
    playerInfo?.kingdomName ??
    "Unknown";

  return (
    <Box sx={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
      <Box sx={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", alignItems: "flex-end", gap: 1, maxWidth: "80%" }}>
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: playerInfo?.colour ?? tokens.ui.textMuted,
            fontSize: "0.7rem",
            fontFamily: tokens.font.body,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {senderName.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", gap: 0.25 }}>
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: "10px",
              color: tokens.ui.textMuted,
              fontWeight: 600,
              px: 0.5,
            }}
          >
            {senderName}
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.75,
              backgroundColor: isMine ? tokens.ui.surfaceRaised : tokens.ui.surface,
              border: `1px solid ${isMine ? `${allegianceColor}33` : tokens.ui.border}`,
              borderRadius: isMine ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
            }}
          >
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                fontSize: tokens.fontSize.xs,
                wordBreak: "break-word",
                color: tokens.ui.text,
                lineHeight: 1.4,
              }}
            >
              {props.message.payload}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

interface MessageProps extends MyGameProps {
  message: ChatMessage;
}
export default Chat;
