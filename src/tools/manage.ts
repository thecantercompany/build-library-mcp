import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DatabaseClient } from "../db/client.js";

export function registerManageTools(server: McpServer, db: DatabaseClient): void {
  server.tool(
    "get_bookmark",
    "Get full details for a specific bookmark by its ID.",
    {
      id: z.number().describe("The bookmark ID"),
    },
    async ({ id }) => {
      try {
        const bookmark = await db.getBookmark(id);

        if (!bookmark) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No bookmark found with ID ${id}.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(bookmark, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error getting bookmark: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "update_bookmark",
    "Update any fields on an existing bookmark. Only provided fields will be changed.",
    {
      id: z.number().describe("The bookmark ID to update"),
      name: z.string().optional().describe("New name"),
      url: z.string().optional().describe("New URL"),
      description: z.string().optional().describe("New description"),
      design_notes: z.string().optional().describe("New design notes"),
      technical_notes: z.string().optional().describe("New technical notes"),
      code_snippets: z.string().optional().describe("New code snippets"),
      future_use: z.string().optional().describe("New future use notes"),
      tags: z.array(z.string()).optional().describe("New tags (replaces existing tags)"),
    },
    async ({ id, name, url, description, design_notes, technical_notes, code_snippets, future_use, tags }) => {
      try {
        const normalizedTags = tags?.map((t) => t.toLowerCase().trim());

        const bookmark = await db.updateBookmark(id, {
          name,
          url,
          description,
          design_notes,
          technical_notes,
          code_snippets,
          future_use,
          tags: normalizedTags,
        });

        if (!bookmark) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No bookmark found with ID ${id}.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Updated bookmark "${bookmark.name}" (ID: ${bookmark.id})`,
                  bookmark,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error updating bookmark: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "delete_bookmark",
    "Remove a bookmark from the library by its ID.",
    {
      id: z.number().describe("The bookmark ID to delete"),
    },
    async ({ id }) => {
      try {
        const deleted = await db.deleteBookmark(id);

        if (!deleted) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No bookmark found with ID ${id}.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Bookmark ${id} deleted successfully.`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error deleting bookmark: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );
}
