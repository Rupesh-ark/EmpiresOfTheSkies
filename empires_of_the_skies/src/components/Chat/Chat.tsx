//based on code from https://frontendshape.com/post/create-a-chat-ui-in-react-with-mui-5
import * as React from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Avatar,
  Grid,
  Paper,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import PersonIcon from "@mui/icons-material/Person";
import { MyGameProps } from "@eots/game";
import { ChatMessage } from "boardgame.io";
import { ChangeEventHandler } from "react";
import ElectionDialog from "../Election/ElectionDialog";

const Chat = (props: MyGameProps) => {
  const [input, setInput] = React.useState("");

  const handleSend = () => {
    if (input.trim() !== "") {
      props.sendChatMessage(input);
      setInput("");
    }
  };

  const handleInputChange: ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (event) => {
    setInput(event.target.value);
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        marginLeft: "20px",
        marginRight: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          alignContent: "center",
          maxWidth: 1220,
          width: "100%",
        }}
      >
        <div style={{ width: "100%" }}>
          <Box
            sx={{
              height: "80vh",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              bgcolor: "grey.200",
            }}
          >
            {props.ctx.phase === "election" &&
              props.ctx.currentPlayer === props.playerID && (
                <ElectionDialog {...props} />
              )}
            <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
              {props.chatMessages.map((message) => (
                <Message key={message.id} message={message} {...props} />
              ))}
            </Box>
            <Box sx={{ p: 2, backgroundColor: "background.default" }}>
              <Grid container spacing={2}>
                <Grid size={10}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Type a message"
                    variant="outlined"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDownCapture={(event) => {
                      if (event.key === "Enter") {
                        handleSend();
                      }
                    }}
                  />
                </Grid>
                <Grid size={2}>
                  <Button
                    fullWidth
                    color="primary"
                    variant="contained"
                    endIcon={<SendIcon />}
                    onClick={handleSend}
                  >
                    Send
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Box>

        </div>
      </div>
    </div>
  );
};

const Message = (props: MessageProps) => {
  const isNotCurrentPlayer = props.message.sender !== props.playerID;
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isNotCurrentPlayer ? "flex-start" : "flex-end",
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: isNotCurrentPlayer ? "row" : "row-reverse",
          alignItems: "center",
        }}
      >
        <Avatar
          sx={{ bgcolor: props.G.playerInfo[props.message.sender].colour }}
        >
          <PersonIcon />
        </Avatar>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            ml: isNotCurrentPlayer ? 1 : 0,
            mr: isNotCurrentPlayer ? 0 : 1,
            backgroundColor: props.G.playerInfo[props.message.sender].colour,
            borderRadius: isNotCurrentPlayer
              ? "20px 20px 20px 5px"
              : "20px 20px 5px 20px",
          }}
        >
          <Typography variant="body1">{props.message.payload}</Typography>
        </Paper>
      </Box>
    </Box>
  );
};

interface MessageProps extends MyGameProps {
  message: ChatMessage;
}
export default Chat;
