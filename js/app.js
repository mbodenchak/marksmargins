/* --------------------------------------------------
   Mark's Margins — app.js (Static Markdown Edition)
   - Articles from /content/index.json + /content/articles/*.md
   - LocalStorage for preferences + cache
   - Slugs, SEO, Sitemap/RSS, Print Resume, Theme toggle
-------------------------------------------------- */

/**********************
 * Simple client store
 **********************/
const Store = {
  key: "logseq_like_site_v1",
  load() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || null;
    } catch {
      return null;
    }
  },
  save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  },
};

/*******************
 * Seed data model
 *******************/
const seed = {
  theme: "dark",
  ui: { showDrafts: false },
  profile: {
    title: "Mark's Margins",
    tagline: "Notes on CS, paralegal work, humanities, and assorted musings.",
    links: [
      { label: "Email", href: "mailto:you@example.com" },
      { label: "GitHub", href: "https://github.com/yourname" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/yourname" },
    ],
  },
  pages: [
    { id: "dashboard", title: "Home", type: "system" },
    { id: "articles", title: "Articles" },
    { id: "notes", title: "Notes" },
    { id: "resume", title: "Resume" },
    { id: "projects", title: "Projects" },
    { id: "about", title: "About" },
  ],
  blocks: {
    dashboard: [
      {
        text: "Welcome to Mark’s Margins. Capture notes, publish articles, and keep your resume handy.",
        tags: ["start"],
        children: [],
      },
      {
        text: "Quick links",
        children: [
          { text: "See [[Articles]]" },
          { text: "Review [[Resume]]" },
          { text: "Capture ideas in [[Notes]]" },
        ],
      },
    ],
    // ARTICLES WILL BE LOADED FROM /content AT RUNTIME
    articles: [],
    notes: [
      {
        text: "Ideas inbox",
        children: [
          { text: "Backlinks graph prototype", tags: ["idea"] },
          { text: "CLI to parse USPTO data to JSON", tags: ["node", "ip"] },
        ],
      },
      {
        text: "Reading list",
        children: [
          { text: "The Coming Wave, notes on governance", tags: ["reading"] },
          { text: "Discrete Math prep plan", tags: ["math", "study"] },
        ],
      },
    ],
    resume: [
      {
        text: "IP Paralegal Intern — Binderow Law Office",
        meta: "Jun–Aug 2025",
        children: [
          {
            text: "Created a 2027 trademark maintenance schedule; automated future schedules with a program to save time.",
          },
          {
            text: "Researched & analyzed Office action refusals under §§2(d), 2(e); identified response strategies from prior filings.",
          },
          {
            text: "Performed USPTO TESS clearance searches; complemented with generative-AI regex prompts.",
          },
        ],
      },
      {
        text: "Freelance Web Developer & Consultant — Various Clients",
        meta: "Nov 2022–May 2025",
        children: [
          {
            text: "Delivered secure, process oriented solutions; confidentiality under NDAs.",
          },
          {
            text: "Organized records, invoices, project files; produced technical documentation.",
          },
        ],
      },
    ],
    projects: [
      {
        text: "Single User Dungeon in JS",
        tags: ["javascript", "game"],
        children: [{ text: "Map system and random events." }],
      },
      {
        text: "Moving App with Mongoose",
        tags: ["node", "mongodb"],
        children: [],
      },
    ],
    about: [
      {
        text: "Hi, I’m Mark. I write about computer science, paralegal work, and the humanities. This site is a notebook and a portfolio.",
        tags: ["about"],
      },
    ],
  },
};

/***************
 * Load state
 ***************/
function isValidState(s) {
  try {
    return s && Array.isArray(s.pages) && s.blocks;
  } catch {
    return false;
  }
}
const loaded = Store.load();
const state = isValidState(loaded) ? loaded : seed;
if (!isValidState(loaded)) Store.save(state);

/* -----------------
   Migrations
------------------*/
function migrateV1(st) {
  if (!st.pages.find((p) => p.id === "about")) {
    st.pages.push({ id: "about", title: "About" });
    st.blocks.about = st.blocks.about || [
      {
        text: "Hi, I’m Mark. I write about computer science, paralegal work, and the humanities. This site is a notebook and a portfolio.",
        tags: ["about"],
      },
    ];
  }
}
migrateV1(state);
persist();

/********************
 * Fetch utilities
 ********************/
async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`Fetch failed: ${url}`);
  return r.json();
}
async function fetchText(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`Fetch failed: ${url}`);
  return r.text();
}

/********************************
 * Content loader (Markdown)
 ********************************/
async function loadArticlesIndex() {
  // network first, fallback to cached articles if it fails
  try {
    const list = await fetchJson("content/index.json");
    const normalized = list.map((a) => ({
      id: a.slug, // keep id = slug
      slug: a.slug,
      text: a.title,
      date: a.date || "",
      tags: a.tags || [],
      summary: a.summary || "",
      draft: !!a.draft,
      // body_md loaded lazily
    }));
    state.blocks.articles = normalized;
    persist();
  } catch (err) {
    console.warn("Using cached/seed articles. Reason:", err.message);
    // leave state as-is (cached or seed)
  }
}

async function ensureArticleBody(art) {
  if (!art || art.body_md) return art;
  try {
    art.body_md = await fetchText(`content/articles/${art.slug}.md`);
  } catch (e) {
    art.body_md = "_Could not load article body._";
    console.error(e);
  }
  return art;
}

/***********
 * Router
 ***********/
const routes = {
  dashboard: renderDashboard,
  articles: renderArticles,
  notes: renderNotes,
  resume: renderResume,
  projects: renderProjects,
  about: renderAbout,
};

function route() {
  const raw = location.hash.replace("#/", "") || "dashboard";

  // Shareable slug route
  if (raw.startsWith("a/")) {
    const sg = decodeURIComponent(raw.split("/")[1] || "");
    const art = findArticleBySlug(sg);
    setActivePage({ id: "articles", title: "Articles" });
    if (art) {
      renderArticleDetail(art.id);
      renderSidebars();
      return;
    }
  }

  if (raw.startsWith("article/")) {
    const articleId = decodeURIComponent(raw.split("/")[1] || "");
    setActivePage({ id: "articles", title: "Articles" });
    renderArticleDetail(articleId);
    renderSidebars();
    return;
  }

  if (raw.startsWith("tag/")) {
    const tag = decodeURIComponent(raw.split("/")[1] || "");
    setActivePage({ id: "articles", title: "Articles" });
    renderTagView(tag);
    renderSidebars();
    return;
  }

  const id = raw.toLowerCase();
  const page = state.pages.find((p) => p.id === id) || state.pages[0];
  setActivePage(page);
  (routes[page.id] || renderDashboard)(page);
  renderSidebars();
}

function setActivePage(page) {
  const titleEl = document.getElementById("pageTitle");
  const bcEl = document.getElementById("breadcrumbs");
  const meta = document.getElementById("pageMeta");
  if (titleEl) titleEl.textContent = page.title;
  if (bcEl) bcEl.innerHTML = `Home / <span>${escapeHtml(page.title)}</span>`;
  const isReading =
    page.id === "articles" && location.hash.includes("article/");
  if (meta)
    meta.textContent = isReading
      ? "Reading view"
      : `${state.blocks[page.id]?.length || 0} blocks`;
  document
    .querySelectorAll(".nav-list a")
    .forEach((a) => a.classList.toggle("active", a.dataset.id === page.id));
}

/*********************
 * Render: Dashboard
 *********************/
function renderDashboard() {
  const recent = publishedArticles().slice(0, 4);
  const profile = state.profile || seed.profile;
  const resumeCount = (state.blocks.resume || []).length;

  document.getElementById("view").innerHTML = `
    <div class="grid cols-3">
      <!-- Left: About card -->
      <section class="card">
        <div class="block-title">${escapeHtml(profile.title || "About")}</div>
        ${
          profile.tagline
            ? `<p class="meta" style="margin:6px 0 10px;">${escapeHtml(
                profile.tagline
              )}</p>`
            : ""
        }
        <div class="grid" style="gap:8px;">
          ${(profile.links || [])
            .map(
              (l) =>
                `<a class="btn link" href="${escapeAttr(l.href)}">${escapeHtml(
                  l.label
                )}</a>`
            )
            .join("")}
        </div>
        <div style="margin-top:10px;">
          <a class="link" href="#/about">Read more →</a>
        </div>
      </section>

      <!-- Middle: Recent Articles feed -->
      <section class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div class="block-title">Recent articles</div>
            <div class="meta">${recent.length} shown · ${
    publishedArticles().length
  } total</div>
          </div>
          <a class="btn link" href="#/articles">View all</a>
        </div>
        <div id="homeFeed" style="margin-top:10px; display:grid; gap:10px;"></div>
      </section>

      <!-- Right: Resume teaser -->
      <section class="card">
        <div class="block-title">Resume</div>
        <div class="meta">${resumeCount} entries</div>
        <div id="resumeTeaser" style="margin-top:10px; display:grid; gap:8px;"></div>
        <div style="margin-top:10px;"><a class="btn link" href="#/resume">Open resume</a></div>
      </section>
    </div>`;

  // SEO
  setMeta({
    title: "Home — Mark's Margins",
    description: state.profile?.tagline,
  });

  // Mount recent articles
  const feed = document.getElementById("homeFeed");
  recent.forEach((a) => feed.appendChild(homeArticleItem(a)));

  // Mount resume teaser
  const rt = document.getElementById("resumeTeaser");
  (state.blocks.resume || []).slice(0, 2).forEach((it) => {
    const row = document.createElement("div");
    row.className = "card";
    row.innerHTML = `<div class="title">${escapeHtml(
      it.text
    )}</div><div class="meta">${escapeHtml(it.meta || "")}</div>`;
    rt.appendChild(row);
  });
}

function homeArticleItem(a) {
  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="block-title" style="display:flex; align-items:center; gap:6px;">${escapeHtml(
      a.text
    )}</div>
    <div class="meta" style="margin:4px 0 8px;">${escapeHtml(
      a.date || ""
    )} · ${(a.tags || [])
    .map((t) => `<span class="tag">#${escapeHtml(String(t))}</span>`)
    .join(" ")}</div>
    ${
      a.summary
        ? `<div style="margin-bottom:8px;">${escapeHtml(a.summary)}</div>`
        : ""
    }
    <a class="btn link" href="#/a/${encodeURIComponent(a.slug)}">Read more</a>`;
  return el;
}

/*******************
 * Render: Articles
 *******************/
function renderArticles() {
  const view = document.getElementById("view");
  view.innerHTML = `
    <div class="card" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <div class="block-title" style="margin-bottom:2px;">Articles</div>
        <div class="meta">${publishedArticles().length} published, ${
    state.blocks.articles.filter((a) => a.draft).length
  } drafts</div>
      </div>
      <label class="meta" style="display:flex; align-items:center; gap:6px;">
        <input id="toggleDrafts" type="checkbox" ${
          state.ui?.showDrafts ? "checked" : ""
        }/> Show drafts
      </label>
    </div>
    <div class="grid cols-2" id="articlesGrid"></div>`;

  setMeta({
    title: "Articles — Mark's Margins",
    description: "Published and draft articles.",
  });

  document.getElementById("toggleDrafts").addEventListener("change", (e) => {
    state.ui = state.ui || {};
    state.ui.showDrafts = !!e.target.checked;
    persist();
    renderArticles();
  });

  const grid = document.getElementById("articlesGrid");
  listableArticles().forEach((b) => grid.appendChild(articleCard(b)));
}

function listableArticles() {
  const showDrafts = !!(state.ui && state.ui.showDrafts);
  const items = (state.blocks.articles || []).slice().sort(byDateDesc);
  return showDrafts ? items : items.filter((a) => !a.draft);
}
function publishedArticles() {
  return (state.blocks.articles || [])
    .filter((a) => !a.draft)
    .slice()
    .sort(byDateDesc);
}
function byDateDesc(a, b) {
  return (b.date || "").localeCompare(a.date || "");
}

function articleCard(b) {
  const el = document.createElement("div");
  el.className = "card";
  const draftBadge = b.draft
    ? `<span class="pill" style="margin-left:8px;">Draft</span>`
    : "";
  el.innerHTML = `
    <div class="block-title" style="display:flex; align-items:center; gap:6px;">${escapeHtml(
      b.text
    )} ${draftBadge}</div>
    <div class="meta" style="margin:4px 0 8px;">${
      b.date ? escapeHtml(b.date) + " · " : ""
    }${(b.tags || [])
    .map((t) => `<span class="tag">#${escapeHtml(String(t))}</span>`)
    .join(" ")}</div>
    ${
      b.summary
        ? `<div style="margin-bottom:10px;">${escapeHtml(b.summary)}</div>`
        : ""
    }
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <a class="btn link" href="#/a/${encodeURIComponent(b.slug)}">Open</a>
      <button class="btn" data-add="notes">Save to Notes</button>
    </div>`;
  el.querySelector("[data-add]")?.addEventListener("click", () => {
    state.blocks.notes = state.blocks.notes || [];
    state.blocks.notes.unshift({
      text: `Saved: ${b.text}`,
      tags: ["saved", "article"],
    });
    persist();
    route();
  });
  return el;
}

/************************
 * Render: Article page
 ************************/
async function renderArticleDetail(articleId) {
  const view = document.getElementById("view");
  const art = (state.blocks.articles || []).find(
    (a) => a.id === articleId || a.slug === articleId
  );
  if (!art) {
    view.innerHTML = `<div class='card'><div class='block-title'>Article not found</div></div>`;
    return;
  }

  await ensureArticleBody(art);
  const html = renderMarkdown(art.body_md || "");

  // SEO
  setMeta({
    title: `${art.text} — Mark's Margins`,
    description:
      art.summary || (art.body_md || "").replace(/\s+/g, " ").slice(0, 160),
  });

  view.innerHTML = `
    <article class='card'>
      <div style='display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;'>
        <div>
          <h1 class='page-title' style='margin:0;'>${escapeHtml(art.text)}</h1>
          <div class='meta' style='margin:6px 0 12px;'>${
            art.date ? escapeHtml(art.date) + " · " : ""
          }${(art.tags || [])
    .map((t) => `<span class='tag'>#${escapeHtml(String(t))}</span>`)
    .join(" ")}</div>
          <div class='meta'>Link: <a class="link" href="#/a/${encodeURIComponent(
            art.slug
          )}">#/a/${escapeHtml(art.slug)}</a></div>
        </div>
        ${art.draft ? `<span class='pill'>Draft</span>` : ""}
      </div>
      ${
        art.summary
          ? `<p style='margin-top:0;' class='meta'>${escapeHtml(
              art.summary
            )}</p>`
          : ""
      }
      <div class='article-body' id='articleBody'>${html}</div>
      <div style='margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;'>
        <button class='btn' id='copyLinkBtn' title='Copy shareable URL'>Copy link</button>
        <a class='btn link' href='#/articles'>Back to Articles</a>
      </div>
    </article>`;

  const copyBtn = document.getElementById("copyLinkBtn");
  if (copyBtn)
    copyBtn.onclick = () => {
      const url = `${location.origin}${location.pathname}#/a/${art.slug}`;
      navigator.clipboard.writeText(url).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy link"), 1200);
      });
    };
}

/********************
 * Render: Tag view
 ********************/
function renderTagView(tag) {
  const view = document.getElementById("view");
  const items = (state.blocks.articles || [])
    .slice()
    .sort(byDateDesc)
    .filter(
      (a) =>
        Array.isArray(a.tags) &&
        a.tags.map(String).includes(tag) &&
        (!a.draft || state.ui?.showDrafts)
    );

  setMeta({
    title: `#${tag} — Mark's Margins`,
    description: `Tagged with #${tag}`,
  });

  view.innerHTML = `
    <div class="card">
      <div class="block-title">Tag: #${escapeHtml(tag)}</div>
      <div class="meta">${items.length} matches</div>
    </div>
    <div class="grid cols-2" id="articlesGrid"></div>`;
  const grid = document.getElementById("articlesGrid");
  items.forEach((b) => grid.appendChild(articleCard(b)));
}

/******************
 * Render: About
 ******************/
function renderAbout() {
  const profile = state.profile || seed.profile;
  const view = document.getElementById("view");

  setMeta({ title: "About — Mark's Margins", description: profile.tagline });

  view.innerHTML = `
    <section class="card">
      <div class="block-title">${escapeHtml(profile.title || "About")}</div>
      ${
        profile.tagline
          ? `<p class="meta" style="margin:6px 0 12px;">${escapeHtml(
              profile.tagline
            )}</p>`
          : ""
      }
      <div class="grid" style="gap:8px;">
        ${(profile.links || [])
          .map(
            (l) =>
              `<a class='btn link' href='${escapeAttr(l.href)}'>${escapeHtml(
                l.label
              )}</a>`
          )
          .join("")}
      </div>
    </section>
    <section class="card" style="margin-top:12px;">
      <div class="block-title">Site notes</div>
      <div class="meta">Articles are served from /content. Update the JSON and Markdown files to publish.</div>
    </section>`;
}

/************************
 * Notes/Resume/Projects
 ************************/
function renderNotes() {
  const v = document.getElementById("view");
  setMeta({ title: "Notes — Mark's Margins", description: "Notes and lists" });
  v.innerHTML = `<div id="notesRoot"></div>`;
  mountBlocks("notesRoot", state.blocks.notes);
}

function renderResume() {
  const items = state.blocks.resume || [];
  const v = document.getElementById("view");

  setMeta({
    title: "Resume — Mark's Margins",
    description: "One-page printable resume",
  });

  v.innerHTML = `
    <section class="card">
      <div class="resume-toolbar">
        <div class="block-title" style="margin:0;">Resume</div>
        <div>
          <button class="btn no-print" id="printResumeBtn" title="Print a one-page PDF">Print résumé</button>
        </div>
      </div>
      <div class="resume" id="resume"></div>
    </section>`;

  const root = document.getElementById("resume");
  items.forEach((it) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div>
        <div class="title">${escapeHtml(it.text)}</div>
        ${(it.children || [])
          .map((c) => `<div class="meta">• ${escapeHtml(c.text)}</div>`)
          .join("")}
      </div>
      <div class="meta">${escapeHtml(it.meta || "")}</div>`;
    root.appendChild(row);
  });

  const btn = document.getElementById("printResumeBtn");
  if (btn) btn.onclick = () => window.print();
}

function renderProjects() {
  const v = document.getElementById("view");
  setMeta({
    title: "Projects — Mark's Margins",
    description: "Selected projects",
  });
  v.innerHTML = `<div id="projectsRoot"></div>`;
  mountBlocks("projectsRoot", state.blocks.projects);
}

/**********************
 * Shared UI helpers
 **********************/
function mountBlocks(rootId, blocks) {
  const root = byId(rootId);
  root.innerHTML = "";
  (blocks || []).forEach((b) => root.appendChild(blockNode(b)));
}

function blockNode(b) {
  const el = document.createElement("div");
  el.className = "block";
  el.innerHTML = `
    <div class="bullet" title="Toggle"></div>
    <div>
      <div>${decorateText(b.text || "")} ${
    b.meta ? `<span class="meta">(${escapeHtml(b.meta)})</span>` : ""
  }</div>
      ${renderTags(b.tags)}
      <div class="children" style="display:${b._fold ? "none" : "block"}"></div>
    </div>`;
  const childRoot = el.querySelector(".children");
  (b.children || []).forEach((c) => childRoot.appendChild(blockNode(c)));
  el.querySelector(".bullet").addEventListener("click", () => {
    b._fold = !b._fold;
    persist();
    childRoot.style.display = b._fold ? "none" : "block";
  });
  return el;
}

function renderTags(tags) {
  if (!tags || !tags.length) return "";
  return `<div style="margin-top:4px;">${tags
    .map((t) => `<span class="tag">#${escapeHtml(String(t))}</span>`)
    .join("")}</div>`;
}

function decorateText(t) {
  return String(t)
    .replace(
      /\[\[(.+?)\]\]/g,
      (m, p1) => `<a class="link" href="#/${slug(p1)}">${escapeHtml(p1)}</a>`
    )
    .replace(
      /(^|\s)#([\p{L}0-9_\-]+)/gu,
      (m, s, tag) =>
        `${s}<a class="tag" href="#/tag/${tag}">#${escapeHtml(tag)}</a>`
    );
}

function renderSidebars() {
  // left pages
  const list = byId("pageList");
  if (list) {
    list.innerHTML = "";
    state.pages.forEach((p) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#/${p.id}`;
      a.dataset.id = p.id;
      a.textContent = p.title;
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  // right tags
  const tags = collectTags();
  const cloud = byId("tagCloud");
  if (cloud) {
    cloud.innerHTML = Object.entries(tags)
      .map(
        ([k, v]) =>
          `<a class="tag" href="#/tag/${k}">#${escapeHtml(k)} (${v})</a>`
      )
      .join(" ");
  }

  // backlinks
  const pageId = location.hash.replace("#/", "") || "dashboard";
  const bl = backlinksForPage(pageId);
  const blRoot = byId("backlinks");
  if (blRoot) {
    blRoot.innerHTML = "";
    bl.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<div class="block-title">From ${escapeHtml(
        item.page
      )}</div><div class="meta">${decorateText(item.snippet)}</div>`;
      blRoot.appendChild(card);
    });
  }
}

function collectTags() {
  const t = {};
  for (const pid in state.blocks) {
    (state.blocks[pid] || []).forEach(walk);
  }
  function walk(b) {
    (b.tags || []).forEach((tag) => (t[tag] = (t[tag] || 0) + 1));
    (b.children || []).forEach(walk);
  }
  return t;
}

function backlinksForPage(pageId) {
  const title = state.pages.find((p) => p.id === pageId)?.title || pageId;
  const links = [];
  for (const pid in state.blocks) {
    (state.blocks[pid] || []).forEach(walk(pid));
  }
  function walk(pid) {
    return function recur(b) {
      if ((b.text || "").includes(`[[${title}]]`)) {
        links.push({
          page: state.pages.find((p) => p.id === pid)?.title || pid,
          snippet: b.text,
        });
      }
      (b.children || []).forEach(recur);
    };
  }
  return links;
}

/***********
 * Search
 ***********/
const q = document.getElementById("q");
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== q) {
    e.preventDefault();
    q?.focus();
  }
});
q?.addEventListener("input", onSearch);

function onSearch() {
  const term = q.value.trim().toLowerCase();
  if (!term) {
    route();
    return;
  }
  const results = [];
  for (const pid in state.blocks) {
    (state.blocks[pid] || []).forEach(walk(pid));
  }
  function walk(pid) {
    return function recur(b) {
      const hay = `${b.text || ""} ${(b.tags || []).join(" ")} ${
        b.summary || ""
      }`.toLowerCase();
      if (hay.includes(term)) results.push({ pid, b });
      (b.children || []).forEach(recur);
    };
  }
  const v = document.getElementById("view");
  v.innerHTML = `<div class="card"><div class="block-title">Search results</div><div class="meta">${results.length} matches</div></div>`;
  results.forEach((r) => v.appendChild(blockNode(r.b)));
}

/***********************
 * Theme (Light/Dark)
 ***********************/
const root = document.documentElement;

function applyTheme() {
  if (!state.theme) state.theme = "dark";
  root.setAttribute("data-theme", state.theme === "light" ? "light" : "dark");
  updateThemeToggleUI();
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  persist();
  applyTheme();
}

function updateThemeToggleUI() {
  const btn = document.getElementById("themeBtn");
  if (!btn) return;
  const isLight = state.theme === "light";
  btn.textContent = isLight ? "🌞 Light" : "🌙 Dark";
  btn.setAttribute("aria-pressed", String(isLight));
}

// Wire button + keyboard shortcut (t)
document.getElementById("themeBtn")?.addEventListener("click", toggleTheme);
document.addEventListener("keydown", (e) => {
  if (
    e.key.toLowerCase() === "t" &&
    !/input|textarea|select/i.test(document.activeElement.tagName)
  ) {
    e.preventDefault();
    toggleTheme();
  }
});

/***********************
 * Export + extras
 ***********************/
document.getElementById("exportBtn")?.addEventListener("click", () => {
  const data = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "site-data.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("exportSiteMap")?.addEventListener("click", () => {
  const xml = buildSitemapXml();
  downloadText("sitemap.xml", xml);
});
document.getElementById("exportRss")?.addEventListener("click", () => {
  const xml = buildRssXml();
  downloadText("rss.xml", xml);
});

/***********************
 * Markdown renderer
 ***********************/
function renderMarkdown(src) {
  if (!src) return "";
  let s = String(src).replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])
  );
  const fences = [];
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => {
    fences.push(code);
    return `§§FENCE${fences.length - 1}§§`;
  });
  const inlines = [];
  s = s.replace(/`([^`]+)`/g, (_, code) => {
    inlines.push(code);
    return `§§INLINE${inlines.length - 1}§§`;
  });
  s = s
    .replace(/^######\s+(.+)$/gm, "<h6>$1</h6>")
    .replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>")
    .replace(/^####\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (m, t, u) => `<a class="link" href="${u}">${t}</a>`
  );
  s = s
    .split(/\n\n+/)
    .map((block) => {
      if (/^(?:\s*[-*+]\s)/m.test(block)) {
        const items = block
          .split(/\n/)
          .filter(Boolean)
          .map((l) => l.replace(/^\s*[-*+]\s+/, ""))
          .map((it) => `<li>${it}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      if (/^(?:\s*\d+\.\s)/m.test(block)) {
        const items = block
          .split(/\n/)
          .filter(Boolean)
          .map((l) => l.replace(/^\s*\d+\.\s+/, ""))
          .map((it) => `<li>${it}</li>`)
          .join("");
        return `<ol>${items}</ol>`;
      }
      return `<p>${block}</p>`;
    })
    .join("\n");
  s = s.replace(
    /§§INLINE(\d+)§§/g,
    (_, i) =>
      `<code>${inlines[+i].replace(
        /[&<>]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])
      )}</code>`
  );
  s = s.replace(
    /§§FENCE(\d+)§§/g,
    (_, i) =>
      `<pre><code>${fences[+i].replace(
        /[&<>]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])
      )}</code></pre>`
  );
  return s;
}

/***********************
 * SEO helpers
 ***********************/
function setMeta({ title, description }) {
  document.title = title || "Mark's Margins";
  ensureMeta(
    "name",
    "description",
    description || "Notes on CS, paralegal work, and the humanities."
  );
  ensureMeta("property", "og:title", title || "Mark's Margins");
  ensureMeta("property", "og:description", description || "");
  ensureMeta("property", "og:type", "article");
}
function ensureMeta(attr, name, content) {
  let m = document.querySelector(`meta[${attr}="${name}"]`);
  if (!m) {
    m = document.createElement("meta");
    m.setAttribute(attr, name);
    document.head.appendChild(m);
  }
  m.setAttribute("content", content);
}

/****************************
 * Sitemap / RSS
 ****************************/
function siteBase() {
  // adjust if deploying under /repo/ path; this keeps current path
  return `${location.origin}${location.pathname.replace(/index\.html?$/, "")}`;
}
function buildSitemapXml() {
  const base = siteBase();
  const urls = [
    `${base}#/`,
    `${base}#/articles`,
    `${base}#/resume`,
    `${base}#/about`,
    ...publishedArticles().map((a) => `${base}#/a/${a.slug}`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>`;
}
function buildRssXml() {
  const base = siteBase();
  const items = publishedArticles().slice(0, 20);
  const channel = {
    title: "Mark's Margins",
    link: base,
    description: state.profile?.tagline || "Articles and notes",
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${escapeXml(channel.title)}</title>
  <link>${escapeXml(channel.link)}</link>
  <description>${escapeXml(channel.description)}</description>
${items
  .map(
    (a) => `
  <item>
    <title>${escapeXml(a.text)}</title>
    <link>${escapeXml(`${base}#/a/${a.slug}`)}</link>
    <guid isPermaLink="false">${escapeXml(a.id || a.slug)}</guid>
    ${a.summary ? `<description>${escapeXml(a.summary)}</description>` : ""}
    ${a.date ? `<pubDate>${new Date(a.date).toUTCString()}</pubDate>` : ""}
  </item>`
  )
  .join("")}
</channel></rss>`;
}
function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/***********************
 * Misc utils
 ***********************/
function persist() {
  Store.save(state);
}
function slug(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[
        c
      ])
  );
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
function escapeXml(s) {
  return String(s || "").replace(
    /[<>&'"]/g,
    (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[
        c
      ])
  );
}
function byId(id) {
  return document.getElementById(id);
}
function findArticleBySlug(sg) {
  return (state.blocks.articles || []).find((a) => a.slug === sg);
}

/**********
 * Init
 **********/
async function init() {
  applyTheme();
  await loadArticlesIndex(); // populate articles from /content
  window.addEventListener("hashchange", route);
  route();
}
init();
