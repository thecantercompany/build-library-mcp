#!/usr/bin/env node
/**
 * Build Library MCP Server
 *
 * A Model Context Protocol server for a personal build reference library.
 * Bookmark websites, UI patterns, and technical implementations with
 * full-text search and tag-based organization.
 *
 * Transport:
 *   - Streamable HTTP (when PORT env var is set — for Railway deployment)
 *   - stdio (default — for local use with Claude Desktop)
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import express from "express";
import { DatabaseClient } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { createServer } from "./server.js";

// CRITICAL: Never use console.log() — it corrupts JSON-RPC on stdout
// Always use console.error() for any logging/debugging

let db: DatabaseClient;

async function initDatabase(): Promise<DatabaseClient> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Error: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  // Run migrations on startup
  await runMigrations(connectionString);

  const client = new DatabaseClient(connectionString);
  await client.testConnection();
  console.error("Database connected successfully");
  return client;
}

async function startHttpServer(): Promise<void> {
  const port = parseInt(process.env.PORT || "3000", 10);
  const app = express();

  const streamableTransports = new Map<string, StreamableHTTPServerTransport>();

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      name: "website-build-ideas",
      version: "1.0.0",
    });
  });

  // Bearer token auth middleware for /mcp
  const authToken = process.env.AUTH_TOKEN;
  app.use("/mcp", (req, res, next) => {
    if (!authToken) return next(); // skip auth if no token configured
    const header = req.headers.authorization;
    if (!header || header !== `Bearer ${authToken}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });

  // Streamable HTTP endpoint
  app.all("/mcp", async (req, res) => {
    console.error(`Streamable HTTP ${req.method} from ${req.ip}`);

    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && streamableTransports.has(sessionId)) {
      await streamableTransports.get(sessionId)!.handleRequest(req, res);
    } else if (req.method === "POST" && !sessionId) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      const server = createServer(db);
      await server.connect(transport);

      await transport.handleRequest(req, res);

      if (transport.sessionId) {
        console.error(`New Streamable HTTP session: ${transport.sessionId}`);
        streamableTransports.set(transport.sessionId, transport);

        transport.onclose = () => {
          console.error(`Streamable HTTP session closed: ${transport.sessionId}`);
          if (transport.sessionId) {
            streamableTransports.delete(transport.sessionId);
          }
        };
      }
    } else if (req.method === "DELETE" && sessionId) {
      const transport = streamableTransports.get(sessionId);
      if (transport) {
        await transport.handleRequest(req, res);
        streamableTransports.delete(sessionId);
      } else {
        res.status(404).json({ error: "Session not found" });
      }
    } else {
      res.status(400).json({ error: "Invalid or missing session ID" });
    }
  });

  app.listen(port, () => {
    console.error(`Build Library MCP server listening on port ${port}`);
    console.error(`Streamable HTTP: http://localhost:${port}/mcp`);
    console.error(`Health check: http://localhost:${port}/health`);
  });
}

async function startStdioServer(): Promise<void> {
  const server = createServer(db);
  const transport = new StdioServerTransport();

  console.error("Starting Build Library MCP server (stdio)...");
  console.error("Available tools: save_bookmark, search_bookmarks, list_bookmarks, list_tags, get_bookmark, update_bookmark, delete_bookmark");

  await server.connect(transport);
}

async function main(): Promise<void> {
  process.on("SIGTERM", async () => {
    console.error("Received SIGTERM, shutting down...");
    if (db) await db.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.error("Received SIGINT, shutting down...");
    if (db) await db.close();
    process.exit(0);
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    process.exit(1);
  });

  // Initialize database
  db = await initDatabase();

  // If PORT is set, use Streamable HTTP transport (Railway deployment)
  // Otherwise, use stdio transport (local Claude Desktop)
  if (process.env.PORT) {
    await startHttpServer();
  } else {
    await startStdioServer();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
