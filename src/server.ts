import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DatabaseClient } from "./db/client.js";
import { registerSaveTools } from "./tools/save.js";
import { registerSearchTools } from "./tools/search.js";
import { registerManageTools } from "./tools/manage.js";

export function createServer(db: DatabaseClient): McpServer {
  const server = new McpServer(
    {
      name: "website-build-ideas",
      version: "1.0.0",
    },
    {
      instructions: `Website Build Ideas — a personal reference library for bookmarking websites, UI patterns, and technical implementations. Use save_bookmark to store entries, search_bookmarks to find them, and list_tags to browse categories.`,
    }
  );

  registerSaveTools(server, db);
  registerSearchTools(server, db);
  registerManageTools(server, db);

  return server;
}
