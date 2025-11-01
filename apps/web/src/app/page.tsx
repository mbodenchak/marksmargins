export default function Home() {
  return (
    <div className="container">
      <h1>Mark’s Margins</h1>
      <p>Personal notebook and portfolio. Articles, projects, and reference notes.</p>
      <hr />
      <section className="card">
        <h2>Recent</h2>
        <ul>
          <li><a href="/articles/hello-world">Hello World</a></li>
          <li><a href="/projects/trademark-maintenance">Trademark maintenance tool</a></li>
          <li><a href="/notes/generating-functions">Generating functions study notes</a></li>
        </ul>
      </section>
    </div>
  );
}
