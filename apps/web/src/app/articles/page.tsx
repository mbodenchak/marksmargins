import Link from "next/link";
import { getArticles } from "@/lib/data";

export const revalidate = 60; // allow refresh once a minute

export default async function ArticlesPage() {
  const articles = await getArticles();

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
              {a.tags?.length ? <span style={{ marginLeft: ".75rem" }}>{a.tags.map(t => `#${t}`).join(" ")}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
