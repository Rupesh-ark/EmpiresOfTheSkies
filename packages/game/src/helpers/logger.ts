import pino from "pino";

const log = pino({
  name: "eots",
  level: (typeof process !== "undefined" && process.env?.LOG_LEVEL) || "info",
});

export default log;
