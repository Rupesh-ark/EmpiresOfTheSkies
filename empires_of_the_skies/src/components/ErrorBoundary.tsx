import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            bgcolor: "#1a1a2e",
            color: "#eee",
            p: 3,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" sx={{ mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography sx={{ mb: 2, opacity: 0.7 }}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            sx={{ color: "#eee", borderColor: "#eee" }}
          >
            Reload
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
