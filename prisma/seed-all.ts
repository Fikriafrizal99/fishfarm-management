import "dotenv/config";
import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const seedScripts = [
  "prisma/seed.ts",
  "prisma/seed-finance-completion.ts",
  "prisma/seed-sales.ts",
] as const;

for (const script of seedScripts) {
  console.log(`\n[seed-all] Running ${script}...`);

  const result = spawnSync(
    npmCommand,
    ["exec", "--", "tsx", script],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${script} failed with exit code ${result.status ?? "unknown"}`,
    );
  }
}

console.log("\n[seed-all] All development seed stages completed successfully.");
