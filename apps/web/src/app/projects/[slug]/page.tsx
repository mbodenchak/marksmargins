import Link from "next/link";
import { getProjectBySlug } from "@/lib/data";
import { getProjects } from "@/lib/data";

export async function generateStaticParams() {
  const items = await getProjects();
  return items.map(p => ({ slug: p.slug }));
}



export const revalidate = 60;

export default async function ProjectDetail({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getProjectBySlug(slug);

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
