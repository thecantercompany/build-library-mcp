import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DatabaseClient } from "../db/client.js";

export function registerSaveTools(server: McpServer, db: DatabaseClient): void {
  server.tool(
    "save_bookmark",
    "Save a new entry to the build reference library. Use this after analyzing a website or discovering an interesting pattern/technique.",
    {
      name: z.string().describe("Short descriptive name for the bookmark (e.g., 'Stripe Pricing Page', 'Framer Motion Parallax')"),
      url: z.string().optional().describe("URL of the website or resource"),
      description: z.string().optional().describe("One-line description of what this is"),
      design_notes: z.string().optional().describe("Visual/UX observations — layout, colors, typography, animations, interactions"),
      technical_notes: z.string().optional().describe("Code patterns, architecture, clever solutions, tech stack details"),
      code_snippets: z.string().optional().describe("Relevant code snippets, pseudocode, or technique descriptions"),
      future_use: z.string().optional().describe("When/how to apply this in a future build"),
      tags: z.array(z.string()).optional().describe("Tags for categorization (e.g., ['animation', 'pricing', 'react'])"),
    },
    async ({ name, url, description, design_notes, technical_notes, code_snippets, future_use, tags }) => {
      try {
        const normalizedTags = tags?.map((t) => t.toLowerCase().trim()) || [];

        const bookmark = await db.saveBookmark({
          name,
          url,
          description,
          design_notes,
          technical_notes,
          code_snippets,
          future_use,
          tags: normalizedTags,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Saved "${bookmark.name}" to build library (ID: ${bookmark.id})`,
                  bookmark: {
                    id: bookmark.id,
                    name: bookmark.name,
                    url: bookmark.url,
                    tags: bookmark.tags,
                    created_at: bookmark.created_at,
                  },
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
              text: `Error saving bookmark: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );
}
