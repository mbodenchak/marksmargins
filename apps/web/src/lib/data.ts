import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";

// types
export type Article = {
  slug: string;
  title: string;
  summary?: string;
  date?: string;
  tags?: string[];
  body: string; // HTML for now
};

export type Project = {
  slug: string;
  name: string;
  blurb?: string;
  tags?: string[];
  body: string;
};

// base dirs (cwd is apps/web at build time)
const dataDir = path.join(process.cwd(), "src", "data");
const articlesDir = path.join(dataDir, "articles");
const projectsDir = path.join(dataDir, "projects");

// helpers
async function readJSON<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function listSlugs(dir: string): Promise<string[]> {
  const files = await fs.readdir(dir);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

// cached loaders
export const getArticles = cache(async (): Promise<Article[]> => {
  const slugs = await listSlugs(articlesDir);
  const items = await Promise.all(
    slugs.map((s) => readJSON<Article>(path.join(articlesDir, `${s}.json`)))
  );
  // newest first if date exists
  return items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
});

export const getArticleBySlug = cache(
  async (slug: string): Promise<Article | null> => {
    try {
      return await readJSON<Article>(path.join(articlesDir, `${slug}.json`));
    } catch {
      return null;
    }
  }
);

export const getProjects = cache(async (): Promise<Project[]> => {
  const slugs = await listSlugs(projectsDir);
  const items = await Promise.all(
    slugs.map((s) => readJSON<Project>(path.join(projectsDir, `${s}.json`)))
  );
  return items;
});

export const getProjectBySlug = cache(
  async (slug: string): Promise<Project | null> => {
    try {
      return await readJSON<Project>(path.join(projectsDir, `${slug}.json`));
    } catch {
      return null;
    }
  }
);
