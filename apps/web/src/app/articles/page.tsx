import Link from "next/link";

type Article = { slug: string; title: string; summary?: string; date?: string; tags?: string[] };

const articles: Article[] = [
  { slug: "hello-world", title: "Hello World", summary: "First post to verify layout.", date: "2025-11-01", tags: ["site"] },
  { slug: "generating-functions", title: "Generating Functions", summary: "Study notes with examples.", date: "2025-11-01", tags: ["math"] },
];

export default function ArticlesPage() {
  return (
    <div className="container">
      <h1>Articles</h1>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {articles.map(a => (
          <li key={a.slug} className="card" style={{ marginBottom: "1rem" }}>
            <h2 style={{ marginTop: 0 }}>
              <Link href={`/articles/${a.slug}`}>{a.title}</Link>
            </h2>
            {a.summary && <p>{a.summary}</p>}
            <div style={{ fontSize: ".9rem", color: "var(--muted)" }}>
              {a.date && <span>{a.date}</span>}
              {a.tags && a.tags.length > 0 && (
                <span style={{ marginLeft: ".75rem" }}>
                  {a.tags.map(t => `#${t}`).join(" ")}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
