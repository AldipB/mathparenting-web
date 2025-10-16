// scripts/authorAll.mjs
import { spawn } from "node:child_process";

// Accept passthrough flags (e.g., --limit=5 --force=true)
const passFlags = process.argv.slice(2);

const grades = ["k", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

(async () => {
  for (const g of grades) {
    console.log(`\n==== Authoring grade ${g} ====`);
    const child = spawn(
      "node",
      ["scripts/autoAuthor.mjs", `--grade=${g}`, ...passFlags],
      { stdio: "inherit" }
    );
    const code = await new Promise((res) => child.on("close", res));
    if (code !== 0) {
      console.error(`Authoring failed for grade ${g} (exit ${code}). Stopping.`);
      process.exit(code);
    }
  }
  console.log("\n✅ All grades processed.");
})();
