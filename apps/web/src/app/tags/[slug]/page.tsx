import Link from "next/link";
import { getItemsByTag } from "@/lib/data";

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { articles, projects } = await getItemsByTag(slug);

  return (
    <main className="container">
      <h1>#{slug}</h1>

      {articles.length === 0 && projects.length === 0 && (
        <p>No content found with this tag.</p>
      )}

      {articles.length > 0 && (
        <>
          <h2>Articles</h2>
          <ul>
            {articles.map(a => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`}>{a.title}</Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {projects.length > 0 && (
        <>
          <h2>Projects</h2>
          <ul>
            {projects.map(p => (
              <li key={p.slug}>
                <Link href={`/projects/${p.slug}`}>{p.name}</Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link href="/">← Back to Home</Link>
    </main>
  );
}
