export interface Bookmark {
  id: number;
  name: string;
  url: string | null;
  description: string | null;
  design_notes: string | null;
  technical_notes: string | null;
  code_snippets: string | null;
  future_use: string | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface BookmarkInput {
  name: string;
  url?: string;
  description?: string;
  design_notes?: string;
  technical_notes?: string;
  code_snippets?: string;
  future_use?: string;
  tags?: string[];
}

export interface BookmarkUpdate {
  name?: string;
  url?: string;
  description?: string;
  design_notes?: string;
  technical_notes?: string;
  code_snippets?: string;
  future_use?: string;
  tags?: string[];
}

export interface TagCount {
  tag: string;
  count: number;
}
