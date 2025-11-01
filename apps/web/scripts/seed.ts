import path from "node:path";
import fs from "node:fs";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/mongodb";
import Article from "../src/lib/models/Article";
import Project from "../src/lib/models/Project";

// Utility to read all JSON files in a folder into one array
function readJSONFolder(folderPath: string) {
  if (!fs.existsSync(folderPath)) return [];
  const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".json"));
  const items = files.map((file) =>
    JSON.parse(fs.readFileSync(path.join(folderPath, file), "utf8"))
  );
  return items.flat(); // supports either arrays or single objects per file
}

async function main() {
  await connectDB();

  // Point to src/data directories
  const baseDir = path.join(process.cwd(), "src/data");
  const articlesDir = path.join(baseDir, "articles");
  const projectsDir = path.join(baseDir, "projects");

  const articles = readJSONFolder(articlesDir);
  const projects = readJSONFolder(projectsDir);

  if (articles.length) {
    await Article.deleteMany({});
    await Article.insertMany(articles);
    console.log(`✅ Seeded ${articles.length} articles`);
  } else {
    console.warn("⚠️  No articles found to seed.");
  }

  if (projects.length) {
    await Project.deleteMany({});
    await Project.insertMany(projects);
    console.log(`✅ Seeded ${projects.length} projects`);
  } else {
    console.warn("⚠️  No projects found to seed.");
  }

  await mongoose.disconnect();
  console.log("🌱 Done seeding!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
