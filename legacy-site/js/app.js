/* --------------------------------------------------
   Mark's Margins — app.js (Externalized Content Edition)
   - Loads profile/pages/blocks from /content/
   - Loads articles index + bodies from /content/articles/
   - Tag links -> #/tag/<tag>
   - Theme toggle, Search, SEO, Sitemap/RSS, Resume print
-------------------------------------------------- */

/**********************
 * Local store
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

/**********************
 * Defaults (tiny)
 **********************/
const defaults = {
  theme: "light",
  ui: { showDrafts: false },
  profile: { title: "Site", tagline: "", links: [] },
  pages: [],
  blocks: {},
};

/********************
 * Safe fetch helpers
 ********************/
async function fetchMeta() {
  try {
    return await fetchJson("content/meta.json");
  } catch {
    // If meta is missing, treat as version 0
    return { version: 0 };
  }
}

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
async function loadJsonSafe(path, fallback = null) {
  try {
    return await fetchJson(path);
  } catch {
    return fallback;
  }
}
async function loadTextSafe(path, fallback = "") {
  try {
    return await fetchText(path);
  } catch {
    return fallback;
  }
}

/********************************
 * Core content loader (/content)
 ********************************/
async function loadCoreContent() {
  const profile = await loadJsonSafe("content/profile.json", defaults.profile);
  const pages = await loadJsonSafe("content/pages.json", defaults.pages);

  const blocks = {};
  blocks.dashboard = await loadJsonSafe("content/blocks/dashboard.json", []);
  blocks.resume = await loadJsonSafe("content/blocks/resume.json", []);
  blocks.projects = await loadJsonSafe("content/blocks/projects.json", []);

  // About prefers Markdown; fallback to JSON if provided
  const aboutMd = await loadTextSafe("content/blocks/about.md", "");
  if (aboutMd.trim()) {
    blocks.about = [{ text: "", body_md: aboutMd }];
  } else {
    blocks.about = await loadJsonSafe("content/blocks/about.json", [
      { text: "About page not configured yet.", tags: ["about"] },
    ]);
  }

  return { profile, pages, blocks };
}

/********************************
 * Articles loader (/content/articles)
 ********************************/
async function loadArticlesIndex() {
  try {
    const list = await fetchJson("content/articles/index.json");
    const normalized = list.map((a) => ({
      id: a.slug,
      slug: a.slug,
      text: a.title,
      date: a.date || "",
      tags: a.tags || [],
      summary: a.summary || "",
      draft: !!a.draft,
      // body_md lazy
    }));
    state.blocks.articles = normalized;
    persist();
  } catch (err) {
    console.warn(
      "Articles index load failed; using cached if any. Reason:",
      err.message
    );
  }
}
async function ensureArticleBody(art) {
  if (!art || art.body_md) return art;
  try {
    art.body_md = await fetchText(`content/articles/${art.slug}.md`);
  } catch {
    art.body_md = "_Could not load article body._";
  }
  return art;
}

/***********
 * Router map
 ***********/
const routes = {
  dashboard: renderDashboard,
  articles: renderArticles,
  resume: renderResume,
  projects: renderProjects,
  about: renderAbout,
};

function route() {
  const raw = location.hash.replace("#/", "") || "dashboard";

  // Shareable article route: #/a/<slug>
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

  // Article by id or slug: #/article/<id-or-slug>
  if (raw.startsWith("article/")) {
    const id = decodeURIComponent(raw.split("/")[1] || "");
    setActivePage({ id: "articles", title: "Articles" });
    renderArticleDetail(id);
    renderSidebars();
    return;
  }

  // Tag filter: #/tag/<tag>
  if (raw.startsWith("tag/")) {
    const tag = decodeURIComponent(raw.split("/")[1] || "");
    setActivePage({ id: "articles", title: "Articles" });
    renderTagView(tag);
    renderSidebars();
    return;
  }

  const id = raw.toLowerCase();
  const page = state.pages.find((p) => p.id === id) ||
    state.pages[0] || { id: "dashboard", title: "Home" };
  setActivePage(page);
  (routes[page.id] || renderDashboard)(page);
  renderSidebars();
}

function setActivePage(page) {
  const titleEl = byId("pageTitle");
  const bcEl = byId("breadcrumbs");
  const meta = byId("pageMeta");
  if (titleEl) titleEl.textContent = page.title;
  if (bcEl) bcEl.innerHTML = `Home / <span>${escapeHtml(page.title)}</span>`;
  const isReading =
    page.id === "articles" && location.hash.includes("article/");
  if (meta)
    meta.textContent = isReading
      ? "Reading view"
      : `${(state.blocks[page.id] || []).length || 0} blocks`;
  document
    .querySelectorAll(".nav-list a")
    .forEach((a) => a.classList.toggle("active", a.dataset.id === page.id));
}

/*********************
 * Render: Dashboard
 *********************/
function renderDashboard() {
  const recent = publishedArticles().slice(0, 4);
  const profile = state.profile || defaults.profile;

  byId("view").innerHTML = `
    <div class="grid cols-1">
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
        <div style="margin-top:10px;"><a class="link" href="#/about">Read more →</a></div>
      </section>

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


    </div>`;

  setMeta({ title: "Home — Mark's Margins", description: profile.tagline });

  const feed = byId("homeFeed");
  recent.forEach((a) => feed.appendChild(homeArticleItem(a)));
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
    )} · ${(a.tags || []).map(tagLink).join(" ")}</div>
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
  const view = byId("view");
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

  byId("toggleDrafts").addEventListener("change", (e) => {
    state.ui = state.ui || {};
    state.ui.showDrafts = !!e.target.checked;
    persist();
    renderArticles();
  });

  const grid = byId("articlesGrid");
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
    }${(b.tags || []).map(tagLink).join(" ")}</div>
    ${
      b.summary
        ? `<div style="margin-bottom:10px;">${escapeHtml(b.summary)}</div>`
        : ""
    }
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <a class="btn link" href="#/a/${encodeURIComponent(b.slug)}">Open</a>
    </div>`;
  return el;
}

/************************
 * Render: Article page
 ************************/
async function renderArticleDetail(articleId) {
  const view = byId("view");
  const art = (state.blocks.articles || []).find(
    (a) => a.id === articleId || a.slug === articleId
  );
  if (!art) {
    view.innerHTML = `<div class="card"><div class="block-title">Article not found</div></div>`;
    return;
  }

  await ensureArticleBody(art);
  const html = renderMarkdown(art.body_md || "");

  setMeta({
    title: `${art.text} — Mark's Margins`,
    description:
      art.summary || (art.body_md || "").replace(/\s+/g, " ").slice(0, 160),
  });

  view.innerHTML = `
    <article class="card">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
        <div>
          <h1 class="page-title" style="margin:0;">${escapeHtml(art.text)}</h1>
          ${
            art.summary
              ? `<p style="margin-top:0;" class="meta">${escapeHtml(
                  art.summary
                )}</p>`
              : ""
          }
          <div class="meta" style="margin:6px 0 12px;">${
            art.date ? escapeHtml(art.date) : ""
          }</div>
        </div>
        
        ${art.draft ? `<span class="pill">Draft</span>` : ""}
      </div>
      
      <div class="article-body" id="articleBody">${html}</div>
      <div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn" id="copyLinkBtn" title="Copy shareable URL">Copy link</button>
        <a class="btn link" href="#/articles">Back to Articles</a>
      </div>
    </article>`;

  // highlight.js, if present
  if (window.hljs) {
    document
      .querySelectorAll("#articleBody pre code")
      .forEach((el) => hljs.highlightElement(el));
  }

  const copyBtn = byId("copyLinkBtn");
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
  const view = byId("view");
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
      <div style="margin-top:8px;"><a class="btn link" href="#/articles">Clear filter</a></div>
    </div>
    <div class="grid cols-2" id="articlesGrid"></div>`;
  const grid = byId("articlesGrid");
  items.forEach((b) => grid.appendChild(articleCard(b)));
}

/******************
 * Render: About
 ******************/
function renderAbout() {
  const profile = state.profile || defaults.profile;
  const view = byId("view");
  setMeta({ title: "About — Mark's Margins", description: profile.tagline });

  // about may be markdown (single block with body_md) or plain text block(s)
  const ab = state.blocks.about || [];
  const body =
    ab[0] && ab[0].body_md
      ? renderMarkdown(ab[0].body_md)
      : ab.map((b) => `<p>${decorateText(b.text || "")}</p>`).join("");

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
      <div class="block-title">About</div>
      <div class="article-body">${body}</div>
    </section>`;
}

/************************
 * Resume/Projects
 ************************/
function renderResume() {
  const v = byId("view");
  setMeta({
    title: "Resume — Mark's Margins",
    description: "One-page printable resume",
  });

  v.innerHTML = `
    <section class="card">
      <div class="resume-toolbar">
        <div class="block-title" style="margin:0;">Resume</div>
        <div><button class="btn no-print" id="printResumeBtn" title="Print a one-page PDF">Print resume</button></div>
      </div>
      <div class="resume" id="resume"></div>
    </section>`;

  const root = byId("resume");
  const data = state.blocks.resume;

  // --- Helpers ---
  const esc = (s) => escapeHtml(String(s ?? ""));
  const make = (tag, cls, html) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  };

  const addRow = (parent, { title, meta, bullets }) => {
    const row = make("div", "row");
    const left = make("div", "");
    left.appendChild(make("div", "title", esc(title)));
    if (Array.isArray(bullets) && bullets.length > 0) {
      const det = make("div", "details");
      bullets.forEach((d) => det.appendChild(make("div", "item", esc(d))));
      left.appendChild(det);
    }
    row.appendChild(left);
    row.appendChild(make("div", "meta", esc(meta || "")));
    parent.appendChild(row);
  };

  const addSectionHeader = (parent, text) =>
    parent.appendChild(make("div", "section-header", esc(text)));

  const renderSkillsGroups = (parent, groups = []) => {
    groups.forEach((g) => {
      const wrap = make("div", "skills-group");
      wrap.appendChild(
        make("div", "group-title", esc(g.label || g.title || ""))
      );
      const list = make("div", "skill-list");
      (g.items || []).forEach((s) =>
        list.appendChild(make("div", "skill", esc(s)))
      );
      wrap.appendChild(list);
      parent.appendChild(wrap);
    });
  };

  const renderSimpleList = (parent, items = []) => {
    items.forEach((it) => {
      const title =
        it.title ||
        it.role ||
        it.degree ||
        it.org ||
        (typeof it === "string" ? it : "");
      const meta = [it.date, it.location].filter(Boolean).join(" · ");
      const bullets = it.bullets || it.details || [];
      addRow(parent, { title, meta, bullets });
    });
  };

  const renderStructured = (sections = []) => {
    sections.forEach((section) => {
      const sec = make("section");
      addSectionHeader(sec, section.title || section.name || "Section");

      if (section.key === "education" || section.key === "experience") {
        (section.items || []).forEach((it) => {
          const titleParts = [];
          if (it.degree) titleParts.push(it.degree);
          if (it.title) titleParts.push(it.title);
          if (it.org || it.school)
            titleParts.push("— " + (it.org || it.school));
          const meta = [it.date, it.location].filter(Boolean).join(" · ");
          addRow(sec, {
            title: titleParts.join(" "),
            meta,
            bullets: it.bullets || it.details || it.coursework || [],
          });
        });
      } else if (section.key === "skills") {
        renderSkillsGroups(sec, section.groups || []);
      } else {
        renderSimpleList(sec, section.items || []);
      }

      root.appendChild(sec);
    });
  };

  // fallback for older data
  const renderLegacy = (items = []) => {
    const sec = make("section");
    addSectionHeader(sec, "Resume");
    items.forEach((it) =>
      addRow(sec, {
        title: it.text,
        meta: it.meta,
        bullets: (it.children || []).map((c) => c.text),
      })
    );
    root.appendChild(sec);
  };

  if (Array.isArray(data)) {
    renderLegacy(data);
  } else if (data && Array.isArray(data.sections)) {
    renderStructured(data.sections);
  } else {
    root.appendChild(make("div", "meta", "No resume data found."));
  }

  byId("printResumeBtn")?.addEventListener("click", () => window.print());
}

function renderProjects() {
  const v = byId("view");
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
  return `<div style="margin-top:4px;">${tags.map(tagLink).join("")}</div>`;
}
function tagLink(t) {
  const s = String(t);
  return `<a class="tag" href="#/tag/${encodeURIComponent(s)}">#${escapeHtml(
    s
  )}</a>`;
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
    (state.pages || []).forEach((p) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#/${p.id}`;
      a.dataset.id = p.id;
      a.textContent = p.title;
      li.appendChild(a);
      list.appendChild(li);
    });
  }
  // right tags cloud
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
  for (const pid in state.blocks) (state.blocks[pid] || []).forEach(walk);
  function walk(b) {
    (b.tags || []).forEach((tag) => (t[tag] = (t[tag] || 0) + 1));
    (b.children || []).forEach(walk);
  }
  // include article tags
  (state.blocks.articles || []).forEach((a) =>
    (a.tags || []).forEach((tag) => (t[tag] = (t[tag] || 0) + 1))
  );
  return t;
}
function backlinksForPage(pageId) {
  const title =
    (state.pages.find((p) => p.id === pageId) || {}).title || pageId;
  const links = [];
  for (const pid in state.blocks) (state.blocks[pid] || []).forEach(walk(pid));
  function walk(pid) {
    return function recur(b) {
      if ((b.text || "").includes(`[[${title}]]`)) {
        links.push({
          page: (state.pages.find((p) => p.id === pid) || {}).title || pid,
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
const q = byId("q");
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== q) {
    e.preventDefault();
    q?.focus();
  }
});
q?.addEventListener("input", onSearch);

function onSearch() {
  const termRaw = q.value.trim();
  if (!termRaw) {
    route();
    return;
  }
  if (termRaw.startsWith("#")) {
    location.hash = `#/tag/${encodeURIComponent(termRaw.slice(1))}`;
    return;
  }
  const term = termRaw.toLowerCase();
  const results = [];
  for (const pid in state.blocks) (state.blocks[pid] || []).forEach(walk(pid));
  function walk(pid) {
    return function recur(b) {
      const hay = `${b.text || ""} ${(b.tags || []).join(" ")} ${
        b.summary || ""
      }`.toLowerCase();
      if (hay.includes(term)) results.push({ pid, b });
      (b.children || []).forEach(recur);
    };
  }
  const v = byId("view");
  v.innerHTML = `<div class="card"><div class="block-title">Search results</div><div class="meta">${results.length} matches</div></div>`;
  results.forEach((r) => v.appendChild(blockNode(r.b)));
}

/***********************
 * Theme (Light/Dark)
 ***********************/
const rootEl = document.documentElement;
function applyTheme() {
  if (!state.theme) state.theme = "dark";
  rootEl.setAttribute("data-theme", state.theme === "light" ? "light" : "dark");
  updateThemeToggleUI();
}
function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  persist();
  applyTheme();
}
function updateThemeToggleUI() {
  const btn = byId("themeBtn");
  if (!btn) return;
  const isLight = state.theme === "light";
  btn.textContent = isLight ? "🌞 Light" : "🌙 Dark";
  btn.setAttribute("aria-pressed", String(isLight));
}
byId("themeBtn")?.addEventListener("click", toggleTheme);
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
byId("exportBtn")?.addEventListener("click", () => {
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
byId("exportSiteMap")?.addEventListener("click", () =>
  downloadText("sitemap.xml", buildSitemapXml())
);
byId("exportRss")?.addEventListener("click", () =>
  downloadText("rss.xml", buildRssXml())
);

/***********************
 * Markdown renderer
 ***********************/
// marked config + highlight.js hook
if (window.marked) {
  marked.setOptions({
    gfm: true,
    breaks: false,
    headerIds: false,
    mangle: false,
  });
  // image renderer: allow relative 'images/foo.jpg' under /content/
  marked.use({
    renderer: {
      image({ href, title, text }) {
        let src = href || "";
        if (src && !/^https?:\/\//i.test(src) && !src.startsWith("/")) {
          src = `content/${src}`;
        }
        const alt = text || "";
        const cap = title || "";
        const img = `<img src="${src}" alt="${escapeHtml(
          alt
        )}" loading="lazy" decoding="async" class="article-img">`;
        return cap
          ? `<figure class="article-figure">${img}<figcaption>${escapeHtml(
              cap
            )}</figcaption></figure>`
          : img;
      },
    },
  });
  if (window.hljs) {
    marked.setOptions({
      highlight: (code, lang) => {
        try {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, {
              language: lang,
              ignoreIllegals: true,
            }).value;
          }
          return hljs.highlightAuto(code).value;
        } catch {
          return code;
        }
      },
    });
  }
}
function renderMarkdown(src) {
  const md = src || "";
  return window.marked ? marked.parse(md) : md;
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
    description: state.profile?.tagline || "Articles from MCB",
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
    /[&<>\"']/g,
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

let state = defaults;

// helper to read /content/meta.json
async function fetchMeta() {
  try {
    return await fetchJson("content/meta.json");
  } catch {
    return { version: 0 };
  }
}

async function bootstrapState() {
  const cached = Store.load();
  const meta = await fetchMeta(); // { version: number, updated: string }
  const cachedVer = cached?.__contentVersion ?? -1;
  const needsRefresh = !cached || cachedVer !== meta.version;

  if (needsRefresh) {
    console.log("[Site] Loading fresh content, version", meta.version);

    // fresh load from /content/
    const core = await loadCoreContent();
    state = { ...defaults, ...core };

    // include the articles index (so articles always refresh)
    await loadArticlesIndex();

    // store version for next comparison
    state.__contentVersion = meta.version;
    persist();
  } else {
    console.log("[Site] Using cached state, version", cachedVer);
    state = cached;
  }
}

// Drawer setup
function setupDrawer() {
  // Support both old id="menuBtn" and new id="drawerOpen"
  const openBtn =
    document.getElementById("drawerOpen") || document.getElementById("menuBtn");
  const drawer = document.getElementById("drawer");
  const closeBtn = document.getElementById("drawerClose");
  const backdrop = document.getElementById("drawerBackdrop");
  const drawerList = document.getElementById("drawerList");
  const pageList = document.getElementById("pageList");

  if (!openBtn || !drawer || !backdrop) return;

  // helper: focusable elements
  const getFocusable = (container) =>
    Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute("disabled"));

  // keep the drawer nav in sync with the left sidebar
  const syncDrawerNav = () => {
    if (!drawerList || !pageList) return;
    drawerList.innerHTML = pageList.innerHTML;
  };
  syncDrawerNav();

  let lastFocus = null;
  const open = () => {
    syncDrawerNav();
    lastFocus = document.activeElement;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    openBtn.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
    document.body.style.overflow = "hidden"; // lock scroll

    const f = getFocusable(drawer);
    (f[0] || drawer).focus();

    // close after navigating
    drawerList
      ?.querySelectorAll("a")
      .forEach((a) => a.addEventListener("click", close, { once: true }));
  };

  const close = () => {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    openBtn.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
    document.body.style.overflow = ""; // unlock scroll
    if (lastFocus && document.contains(lastFocus)) {
      lastFocus.focus();
    } else {
      openBtn.focus();
    }
  };

  openBtn.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  // ESC closes
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("open")) {
      e.preventDefault();
      close();
    }
  });

  // Focus trap while open
  drawer.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !drawer.classList.contains("open")) return;
    const f = getFocusable(drawer);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Auto-close on desktop
  const mq = window.matchMedia("(min-width: 861px)");
  const onChange = (e) => {
    if (e.matches) close();
  };
  mq.addEventListener
    ? mq.addEventListener("change", onChange)
    : mq.addListener(onChange);

  // Re-sync if the left nav changes dynamically
  if (pageList) {
    const obs = new MutationObserver(syncDrawerNav);
    obs.observe(pageList, { childList: true, subtree: true });
  }
}
// init hook
document.addEventListener("DOMContentLoaded", () => {
  setupDrawer();
});

async function init() {
  applyTheme();
  await bootstrapState(); // load from cache or /content
  window.addEventListener("hashchange", route);
  route();
}
init();
