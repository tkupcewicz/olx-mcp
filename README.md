# OLX MCP Server

MCP server for [OLX](https://www.olx.pl/) marketplace. Enables AI assistants to search listings, get offer details, track prices over time, and compare offers across OLX Poland and other supported countries.

Uses the OLX internal frontend API (read-only, no auth required).

## Tools

| Tool | Description |
|------|-------------|
| `search_offers` | Search listings with query, category, location, price range, sorting, and pagination |
| `get_offer` | Get full offer details — description, params, images, seller info |
| `get_categories` | Browse category tree with IDs for filtering searches |
| `track_search` | Save search criteria and take an initial price snapshot |
| `get_price_history` | View price trends for tracked searches (auto-refreshes if stale) |
| `compare_offers` | Side-by-side comparison of 2–10 offers |

## Resources

- `olx://tracked-searches` — list all tracked searches
- `olx://tracked-searches/{id}` — detail + price snapshots for a tracked search

## Setup

```bash
npm install
```

### Claude Code

The repo includes `.mcp.json` — Claude Code will pick it up automatically when you open the project directory.

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "olx": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/path/to/olx-mcp"
    }
  }
}
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

## Supported Countries

`pl` (default), `bg`, `ro`, `pt`, `ua`, `kz`

Pass `country` parameter to any tool to switch. Category data is curated for Poland; other countries use auto-discovery from search results.

## Tech Stack

- TypeScript / Node.js (ESM)
- `@modelcontextprotocol/sdk` — MCP server framework
- `better-sqlite3` — SQLite for price tracking persistence
- `zod` — input validation
- Token bucket rate limiter (4000 req / 5 min per country)

## Development

```bash
npm run dev    # run with tsx
npm run build  # compile TypeScript
npm start      # run compiled JS
```

## License

MIT
