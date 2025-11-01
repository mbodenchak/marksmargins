import Link from "next/link";
import { getProjects } from "@/lib/data";

export const revalidate = 60;

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="container">
      <h1>Projects</h1>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {projects.map(p => (
          <li key={p.slug} className="card" style={{ marginBottom: "1rem" }}>
            <h2 style={{ marginTop: 0 }}>
              <Link href={`/projects/${p.slug}`}>{p.name}</Link>
            </h2>
            {p.tags?.length && (
  <p className="tags">
    {p.tags.map(t => (
      <Link key={t} href={`/tags/${t.toLowerCase()}`}>#{t}</Link>
    ))}
  </p>
)}

            {p.blurb && <p>{p.blurb}</p>}
            {p.tags?.length ? (
              <div style={{ fontSize: ".9rem", color: "var(--muted)" }}>
                {p.tags.map(t => `#${t}`).join(" ")}
              </div>
            ) : null}
          </li>
        ))}
        
      </ul>
    </div>
  );
}
