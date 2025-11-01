export type ContentType = "article" | "project" | "note" | "reference";

export type ContentItem = {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  body?: string;
  tags: string[];
  draft: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  meta?: Record<string, unknown>;
};
