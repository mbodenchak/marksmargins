import Link from "next/link";

type ProjectDoc = { name: string; body: string };
const fake: Record<string, ProjectDoc> = {
  "trademark-maintenance": {
    name: "Trademark Maintenance App",
    body: "<p>Tracks Section 8, 9, 15, and 71 deadlines and sends reminders.</p>",
  },
  "resume-json-renderer": {
    name: "Resume JSON Renderer",
    body: "<p>Renders resume sections from a JSON schema. Drives site resume page.</p>",
  },
};

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;          // ⬅️ unwrap the Promise
  const doc = fake[slug];

  if (!doc) {
    return (
      <div className="container">
        <h1>Not found</h1>
        <p><Link href="/projects">Back to Projects</Link></p>
      </div>
    );
  }

  return (
    <article className="container card">
      <h1 style={{ marginTop: 0 }}>{doc.name}</h1>
      <div dangerouslySetInnerHTML={{ __html: doc.body }} />
      <hr />
      <p><Link href="/projects">← Back to Projects</Link></p>
    </article>
  );
}
