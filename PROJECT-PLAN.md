# Website Build Ideas — Project Plan

## Overview

MCP server for a personal build reference library. Bookmark websites, UI patterns, and technical implementations with full-text search and tag-based organization. Postgres-backed, deployed on Railway.

## Architecture

- **Server:** Express + Streamable HTTP transport (MCP SDK)
- **Database:** PostgreSQL on Railway
- **Deployment:** Railway auto-deploy from GitHub
- **Access:** Claude Desktop via `mcp-remote` in team config

## Workflow

1. User shares a URL or describes something interesting
2. Claude fetches and analyzes the site/feature (design + technical)
3. Claude asks what specifically caught the user's eye
4. Claude calls `save_bookmark` to store a structured entry

## MCP Tools

| Tool | Description |
|------|-------------|
| `save_bookmark` | Save a new entry with name, URL, notes, code snippets, tags |
| `search_bookmarks` | Full-text search across all fields |
| `list_bookmarks` | List entries (newest first), optional tag filter |
| `list_tags` | Get all tags with counts |
| `get_bookmark` | Get a specific entry by ID |
| `update_bookmark` | Update any fields on an existing entry |
| `delete_bookmark` | Remove an entry by ID |

## Database Schema

Single `bookmarks` table with GIN indexes for tags and full-text search.

## Infrastructure

- **GitHub:** `thecantercompany/build-library-mcp`
- **Railway project:** Website Build Ideas
- **URL:** `https://build-library-mcp-production.up.railway.app`
- **MCP endpoint:** `/mcp`
- **Health check:** `/health`
