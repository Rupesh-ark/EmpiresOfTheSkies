const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "dist", "cjs", "package.json");

fs.writeFileSync(
  target,
  JSON.stringify({ type: "commonjs" }, null, 2)
);

console.log("Wrote dist/cjs/package.json");