import Link from "next/link";
import { getArticleBySlug } from "@/lib/data";
import { getArticles } from "@/lib/data";

export async function generateStaticParams() {
  const items = await getArticles();
  return items.map(a => ({ slug: a.slug }));
}


export const revalidate = 60;

export default async function ArticleDetail({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getArticleBySlug(slug);

  if (!doc) {
    return (
      <div className="container">
        <h1>Not found</h1>
        <p><Link href="/articles">Back to Articles</Link></p>
      </div>
    );
  }

  return (
    <article className="container card">
      <h1 style={{ marginTop: 0 }}>{doc.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: doc.body }} />
      <hr />
      <p><Link href="/articles">← Back to Articles</Link></p>
    </article>
  );
}
