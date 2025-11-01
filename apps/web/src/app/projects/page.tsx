import Link from "next/link";

type Project = { slug: string; name: string; blurb?: string; tags?: string[] };

const projects: Project[] = [
  { slug: "trademark-maintenance", name: "Trademark Maintenance App", blurb: "Schedule tracking and reminders.", tags: ["law", "automation"] },
  { slug: "resume-json-renderer", name: "Resume JSON Renderer", blurb: "Renders resume sections from JSON.", tags: ["web"] },
];

export default function ProjectsPage() {
  return (
    <div className="container">
      <h1>Projects</h1>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {projects.map(p => (
          <li key={p.slug} className="card" style={{ marginBottom: "1rem" }}>
            <h2 style={{ marginTop: 0 }}>
              <Link href={`/projects/${p.slug}`}>{p.name}</Link>
            </h2>
            {p.blurb && <p>{p.blurb}</p>}
            {p.tags && p.tags.length > 0 && (
              <div style={{ fontSize: ".9rem", color: "var(--muted)" }}>
                {p.tags.map(t => `#${t}`).join(" ")}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
