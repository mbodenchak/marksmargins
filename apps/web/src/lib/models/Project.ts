import { Schema, InferSchemaType, models, model } from "mongoose";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const LinkSchema = new Schema(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, default: "" },
    description: { type: String, default: "" }, // markdown or HTML
    tags: { type: [String], index: true, default: [] },
    techStack: { type: [String], index: true, default: [] },
    repoUrl: { type: String, default: "" },
    liveUrl: { type: String, default: "" },
    links: { type: [LinkSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    startDate: { type: Date },
    endDate: { type: Date },
    coverImage: { type: String, default: "" },
  },
  { timestamps: true }
);

ProjectSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
  next();
});

ProjectSchema.index({ name: "text", summary: "text", description: "text" });

export type ProjectDoc = InferSchemaType<typeof ProjectSchema>;
export default models.Project || model("Project", ProjectSchema);
