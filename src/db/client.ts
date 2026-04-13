import pg from "pg";
import type { Bookmark, BookmarkInput, BookmarkUpdate, TagCount } from "../types/index.js";

const { Pool } = pg;

export class DatabaseClient {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }
  }

  async saveBookmark(input: BookmarkInput): Promise<Bookmark> {
    const result = await this.pool.query<Bookmark>(
      `INSERT INTO bookmarks (name, url, description, design_notes, technical_notes, code_snippets, future_use, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.name,
        input.url || null,
        input.description || null,
        input.design_notes || null,
        input.technical_notes || null,
        input.code_snippets || null,
        input.future_use || null,
        input.tags || [],
      ]
    );
    return result.rows[0];
  }

  async getBookmark(id: number): Promise<Bookmark | null> {
    const result = await this.pool.query<Bookmark>(
      "SELECT * FROM bookmarks WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  }

  async listBookmarks(tag?: string, limit: number = 50): Promise<Bookmark[]> {
    if (tag) {
      const result = await this.pool.query<Bookmark>(
        "SELECT * FROM bookmarks WHERE $1 = ANY(tags) ORDER BY created_at DESC LIMIT $2",
        [tag.toLowerCase(), limit]
      );
      return result.rows;
    }
    const result = await this.pool.query<Bookmark>(
      "SELECT * FROM bookmarks ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    return result.rows;
  }

  async searchBookmarks(query: string, tag?: string): Promise<Bookmark[]> {
    if (tag) {
      const result = await this.pool.query<Bookmark>(
        `SELECT *, ts_rank(
           to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(design_notes,'') || ' ' || coalesce(technical_notes,'') || ' ' || coalesce(code_snippets,'') || ' ' || coalesce(future_use,'')),
           plainto_tsquery('english', $1)
         ) AS rank
         FROM bookmarks
         WHERE to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(design_notes,'') || ' ' || coalesce(technical_notes,'') || ' ' || coalesce(code_snippets,'') || ' ' || coalesce(future_use,''))
               @@ plainto_tsquery('english', $1)
           AND $2 = ANY(tags)
         ORDER BY rank DESC`,
        [query, tag.toLowerCase()]
      );
      return result.rows;
    }
    const result = await this.pool.query<Bookmark>(
      `SELECT *, ts_rank(
         to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(design_notes,'') || ' ' || coalesce(technical_notes,'') || ' ' || coalesce(code_snippets,'') || ' ' || coalesce(future_use,'')),
         plainto_tsquery('english', $1)
       ) AS rank
       FROM bookmarks
       WHERE to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(design_notes,'') || ' ' || coalesce(technical_notes,'') || ' ' || coalesce(code_snippets,'') || ' ' || coalesce(future_use,''))
             @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC`,
      [query]
    );
    return result.rows;
  }

  async listTags(): Promise<TagCount[]> {
    const result = await this.pool.query<TagCount>(
      `SELECT unnest(tags) AS tag, COUNT(*) AS count
       FROM bookmarks
       GROUP BY tag
       ORDER BY count DESC, tag ASC`
    );
    return result.rows;
  }

  async updateBookmark(id: number, update: BookmarkUpdate): Promise<Bookmark | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (update.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(update.name);
    }
    if (update.url !== undefined) {
      fields.push(`url = $${paramIndex++}`);
      values.push(update.url);
    }
    if (update.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(update.description);
    }
    if (update.design_notes !== undefined) {
      fields.push(`design_notes = $${paramIndex++}`);
      values.push(update.design_notes);
    }
    if (update.technical_notes !== undefined) {
      fields.push(`technical_notes = $${paramIndex++}`);
      values.push(update.technical_notes);
    }
    if (update.code_snippets !== undefined) {
      fields.push(`code_snippets = $${paramIndex++}`);
      values.push(update.code_snippets);
    }
    if (update.future_use !== undefined) {
      fields.push(`future_use = $${paramIndex++}`);
      values.push(update.future_use);
    }
    if (update.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(update.tags);
    }

    if (fields.length === 0) return this.getBookmark(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.pool.query<Bookmark>(
      `UPDATE bookmarks SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async deleteBookmark(id: number): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM bookmarks WHERE id = $1",
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
