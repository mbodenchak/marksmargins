import { Schema, InferSchemaType, models, model } from "mongoose";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const ArticleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" }, // markdown or HTML
    tags: { type: [String], index: true, default: [] },
    coverImage: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
      index: true,
    },
    readingTime: { type: Number, default: 0 }, // minutes
    // dates
    publishedAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// keep slug in sync if not provided
ArticleSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  }
  next();
});

ArticleSchema.index({ title: "text", excerpt: "text", content: "text" });

export type ArticleDoc = InferSchemaType<typeof ArticleSchema>;
export default models.Article || model("Article", ArticleSchema);
