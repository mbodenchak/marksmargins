import Link from "next/link";

type ArticleDoc = { title: string; body: string };

const fake: Record<string, ArticleDoc> = {
  "hello-world": {
    title: "Hello World",
    body: "<p>Seed page for routing and styles. Replace with real content soon.</p>",
  },
  "generating-functions": {
    title: "Generating Functions",
    body: "<p>Coming soon. Notes, examples, and practice problems.</p>",
  },
};

export default async function ArticleDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;          // ✅ unwrap the Promise
  const doc = fake[slug];                 // ✅ fully typed, no warning

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
