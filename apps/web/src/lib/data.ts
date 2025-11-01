import { connectDB } from "./mongodb";
import Article from "./models/Article";
import Project from "./models/Project";

export async function getArticles() {
  await connectDB();
  return Article.find({ status: "published" }).sort({ publishedAt: -1 }).lean();
}

export async function getArticleBySlug(slug: string) {
  await connectDB();
  return Article.findOne({ slug }).lean();
}

export async function getProjects() {
  await connectDB();
  return Project.find().sort({ createdAt: -1 }).lean();
}

export async function getProjectBySlug(slug: string) {
  await connectDB();
  return Project.findOne({ slug }).lean();
}
