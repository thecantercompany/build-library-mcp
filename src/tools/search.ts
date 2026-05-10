import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { reportError } from "canter-error-reporter";
import type { DatabaseClient } from "../db/client.js";
import type { Bookmark } from "../types/index.js";

function formatBookmark(b: Bookmark): string {
  const lines = [
    `### ${b.name} (ID: ${b.id})`,
    b.url ? `**URL:** ${b.url}` : null,
    b.tags.length > 0 ? `**Tags:** ${b.tags.map((t) => "`" + t + "`").join(" ")}` : null,
    `**Added:** ${new Date(b.created_at).toISOString().split("T")[0]}`,
    "",
    b.description ? `**Description:** ${b.description}` : null,
    b.design_notes ? `\n**Design Notes:**\n${b.design_notes}` : null,
    b.technical_notes ? `\n**Technical Notes:**\n${b.technical_notes}` : null,
    b.code_snippets ? `\n**Code Snippets:**\n\`\`\`\n${b.code_snippets}\n\`\`\`` : null,
    b.future_use ? `\n**Future Use:** ${b.future_use}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

export function registerSearchTools(server: McpServer, db: DatabaseClient): void {
  server.tool(
    "search_bookmarks",
    "Full-text search across all bookmark fields. Searches name, description, design notes, technical notes, code snippets, and future use.",
    {
      query: z.string().describe("Search keywords"),
      tag: z.string().optional().describe("Optional tag to filter results"),
    },
    async ({ query, tag }) => {
      try {
        const results = await db.searchBookmarks(query, tag);

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No bookmarks found matching "${query}"${tag ? ` with tag "${tag}"` : ""}.`,
              },
            ],
          };
        }

        const formatted = results.map(formatBookmark).join("\n\n---\n\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `Found ${results.length} bookmark(s) matching "${query}"${tag ? ` with tag "${tag}"` : ""}:\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        reportError({
          project: "website-build-ideas",
          category: "tool_error",
          message: error instanceof Error ? error.message : String(error),
          rawError: error,
        });
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error searching bookmarks: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "list_bookmarks",
    "List all bookmarks in the library, newest first. Optionally filter by tag.",
    {
      tag: z.string().optional().describe("Filter by tag (e.g., 'animation', 'react')"),
      limit: z.number().optional().default(50).describe("Max results to return (default: 50)"),
    },
    async ({ tag, limit }) => {
      try {
        const results = await db.listBookmarks(tag, limit);

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: tag
                  ? `No bookmarks found with tag "${tag}".`
                  : "The build library is empty. Save your first bookmark!",
              },
            ],
          };
        }

        const formatted = results.map(formatBookmark).join("\n\n---\n\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `${results.length} bookmark(s)${tag ? ` tagged "${tag}"` : ""}:\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        reportError({
          project: "website-build-ideas",
          category: "tool_error",
          message: error instanceof Error ? error.message : String(error),
          rawError: error,
        });
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error listing bookmarks: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "list_tags",
    "Get all tags used in the library with their counts. Useful for browsing what categories exist.",
    {},
    async () => {
      try {
        const tags = await db.listTags();

        if (tags.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No tags found. Save some bookmarks with tags first!",
              },
            ],
          };
        }

        const formatted = tags
          .map((t) => `- \`${t.tag}\` (${t.count})`)
          .join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `Tags in the build library:\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        reportError({
          project: "website-build-ideas",
          category: "tool_error",
          message: error instanceof Error ? error.message : String(error),
          rawError: error,
        });
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error listing tags: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );
}
