import fs from "node:fs";
import path from "node:path";

/**
 * Load .env file into process.env (no external dependency needed).
 * Only sets vars that are not already defined in the environment.
 */
export function loadEnv(filePath?: string): void {
  const envPath = filePath ?? path.join(process.cwd(), ".env");

  let content: string;
  try {
    content = fs.readFileSync(envPath, "utf-8");
  } catch {
    return; // .env file is optional
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
