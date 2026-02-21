//based on code from https://frontendshape.com/post/create-a-chat-ui-in-react-with-mui-5
// king svg from King by Alina Oleynik from <a href="https://thenounproject.com/browse/icons/term/king/" target="_blank" title="King Icons">Noun Project</a>

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
                <Grid item xs={10}>
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
                <Grid item xs={2}>
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
          <text style={{ fontSize: 16 }}>
            King SVG from King by Alina Oleynik from{" "}
            <a
              href="https://thenounproject.com/browse/icons/term/king/"
              target="_blank"
              title="King Icons"
            >
              Noun Project
            </a>
          </text>
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
          <svg
            version="1.1"
            x="0px"
            y="0px"
            viewBox="0 0 100 115"
            enable-background="new 0 0 100 100"
          >
            <circle cx="50.04" cy="16.438" r="3.5" />
            <circle cx="60.727" cy="63.874" r="3.5" />
            <circle cx="39.352" cy="63.874" r="3.5" />
            <circle cx="84.462" cy="27.731" r="2.773" />
            <circle cx="15.538" cy="27.731" r="2.773" />
            <path d="M70.519,35.944c-7.931-1.015-14.741-5.691-20.479-10.987c-5.738,5.295-12.548,9.971-20.479,10.987  c-3.877,0.496-7.998-0.103-11.25-2.271l4.302,20.785c0,0,13.937-3.833,27.427-3.833c13.49,0,27.427,3.833,27.427,3.833l4.302-20.785  C78.516,35.841,74.396,36.441,70.519,35.944z M49.96,45.749l-3.42-6.167l3.42-5.917l3.42,5.917L49.96,45.749z" />
            <path d="M55.977,75.374c-3.531-0.813-5.938,1.438-5.938,1.438s-2.406-2.25-5.938-1.438c-4.785,1.101-6.355,8.71-12,6.875  c0,0,1.219,4.75,8.188,4.813s9.75-5.438,9.75-5.438s2.781,5.5,9.75,5.438s8.188-4.813,8.188-4.813  C62.332,84.084,60.762,76.475,55.977,75.374z" />
          </svg>
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
