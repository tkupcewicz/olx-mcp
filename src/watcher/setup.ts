import { loadEnv } from "./env.js";
import { getUpdates } from "./telegram.js";

/**
 * CLI helper to discover your Telegram chat ID.
 *
 * Usage:
 *   1. Create a bot via @BotFather on Telegram
 *   2. Set TELEGRAM_BOT_TOKEN in .env
 *   3. Send any message to your bot in Telegram
 *   4. Run: npm run watch:setup
 */

loadEnv();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error("Error: TELEGRAM_BOT_TOKEN is not set in .env");
  console.error("");
  console.error("Steps:");
  console.error("  1. Open Telegram and message @BotFather");
  console.error("  2. Send /newbot and follow the prompts");
  console.error("  3. Copy the bot token to .env:");
  console.error("     TELEGRAM_BOT_TOKEN=your_token_here");
  console.error("  4. Send any message to your new bot");
  console.error("  5. Run this script again");
  process.exit(1);
}

console.log("Fetching recent messages to your bot...\n");

try {
  const chats = await getUpdates(botToken);

  if (chats.length === 0) {
    console.error("No messages found.");
    console.error("");
    console.error("Make sure you've sent a message to your bot in Telegram,");
    console.error("then run this script again.");
    process.exit(1);
  }

  console.log("Found chat(s):\n");
  for (const chat of chats) {
    console.log(`  Chat ID: ${chat.chatId}  (${chat.username})`);
  }

  console.log("");
  console.log("Add to your .env file:");
  console.log(`  TELEGRAM_CHAT_ID=${chats[0].chatId}`);
} catch (err) {
  console.error("Failed to fetch updates:", (err as Error).message);
  process.exit(1);
}
