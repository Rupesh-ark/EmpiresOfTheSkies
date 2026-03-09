//based on code from https://frontendshape.com/post/create-a-chat-ui-in-react-with-mui-5
import * as React from "react";
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Paper,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { MyGameProps } from "@eots/game";
import { ChatMessage } from "boardgame.io";
import { ChangeEventHandler } from "react";
import ElectionDialog from "../Election/ElectionDialog";

const Chat = (props: MyGameProps) => {
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const allegiance = props.playerID ? props.G.playerInfo[props.playerID]?.hereticOrOrthodox : undefined;
  const shimmerGradient = allegiance === "heretic"
    ? "linear-gradient(90deg, #E77B00, #FFB04D, #E77B00, #FFB04D, #E77B00)"
    : "linear-gradient(90deg, #A74383, #D06AAD, #A74383, #D06AAD, #A74383)";

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
      {props.ctx.phase === "election" && props.ctx.currentPlayer === props.playerID && (
        <ElectionDialog {...props} />
      )}

      {/* Slim top border accent */}
      <Box
        sx={{
          height: 3,
          flexShrink: 0,
          background: shimmerGradient,
          backgroundSize: "300% 100%",
          animation: "shimmer 8s linear infinite",
          "@keyframes shimmer": {
            "0%": { backgroundPosition: "0% 0%" },
            "100%": { backgroundPosition: "300% 0%" },
          },
        }}
      />

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5, bgcolor: "#f7f7f8" }}>
        {props.chatMessages.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.disabled", textAlign: "center", mt: 4 }}>
            No messages yet. Say something!
          </Typography>
        )}
        {props.chatMessages.map((message) => (
          <Message key={message.id} message={message} {...props} />
        ))}
        <div ref={bottomRef} />
      </Box>

      {/* Input */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          flexShrink: 0,
          backgroundColor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          gap: 1,
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder="Type a message…"
          variant="outlined"
          value={input}
          onChange={handleInputChange}
          onKeyDownCapture={(event) => {
            if (event.key === "Enter") handleSend();
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!input.trim()}
          sx={{
            bgcolor: "#0d0d0d",
            color: "white",
            "&:hover": { bgcolor: "#A74383" },
            "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
            borderRadius: 2,
            width: 40,
            height: 40,
            flexShrink: 0,
          }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

const Message = (props: MessageProps) => {
  const isMine = props.message.sender === props.playerID;
  const playerInfo = props.G.playerInfo[props.message.sender];
  const allegiance = playerInfo?.hereticOrOrthodox;
  const allegianceColour = allegiance === "heretic" ? "#E77B00" : "#A74383";
  const senderName =
    props.matchData?.find((p) => String(p.id) === props.message.sender)?.name ??
    playerInfo?.kingdomName ??
    "Unknown";

  return (
    <Box sx={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
      <Box sx={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", alignItems: "flex-end", gap: 1, maxWidth: "75%" }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: playerInfo?.colour ?? "#888", fontSize: "0.8rem", flexShrink: 0 }}>
          {senderName.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", gap: 0.25 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, px: 1 }}>
            {senderName}
          </Typography>
          <Paper
            elevation={1}
            sx={{
              px: 1.5,
              py: 1,
              bgcolor: "white",
              borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            }}
          >
            <Typography variant="body2" sx={{ wordBreak: "break-word", color: allegianceColour, fontWeight: 500 }}>
              {props.message.payload}
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

interface MessageProps extends MyGameProps {
  message: ChatMessage;
}
export default Chat;