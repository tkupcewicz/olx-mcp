const TELEGRAM_API = "https://api.telegram.org";
const MAX_MESSAGE_LENGTH = 4096;

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export function getTelegramConfig(): TelegramConfig {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID is not set");

  return { botToken, chatId };
}

async function callTelegram(
  botToken: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const url = `${TELEGRAM_API}/bot${botToken}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description ?? "unknown error"}`);
  }
  return data.result;
}

/**
 * Split a long message into chunks that fit Telegram's 4096 char limit.
 * Splits on newlines to avoid breaking mid-line.
 */
function splitMessage(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_MESSAGE_LENGTH) {
      chunks.push(remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf("\n", MAX_MESSAGE_LENGTH);
    if (splitAt === -1 || splitAt < MAX_MESSAGE_LENGTH / 2) {
      splitAt = MAX_MESSAGE_LENGTH;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}

/**
 * Send an HTML-formatted message to the configured Telegram chat.
 * Automatically splits long messages.
 */
export async function sendMessage(
  config: TelegramConfig,
  html: string,
): Promise<void> {
  const chunks = splitMessage(html);

  for (const chunk of chunks) {
    await callTelegram(config.botToken, "sendMessage", {
      chat_id: config.chatId,
      text: chunk,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  }
}

/**
 * Get recent updates — used by setup script to discover chat ID.
 */
export async function getUpdates(
  botToken: string,
): Promise<{ chatId: number; username: string }[]> {
  const url = `${TELEGRAM_API}/bot${botToken}/getUpdates?limit=10`;
  const response = await fetch(url);
  const data = (await response.json()) as {
    ok: boolean;
    result: Array<{
      message?: { chat: { id: number; username?: string; first_name?: string } };
    }>;
    description?: string;
  };

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description ?? "unknown error"}`);
  }

  const chats = new Map<number, string>();
  for (const update of data.result) {
    if (update.message?.chat) {
      const chat = update.message.chat;
      chats.set(chat.id, chat.username ?? chat.first_name ?? "unknown");
    }
  }

  return Array.from(chats.entries()).map(([chatId, username]) => ({
    chatId,
    username,
  }));
}
