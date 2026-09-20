import { z } from "zod";
import { isHttpUrl } from "@/lib/utils/normalize-url";

export const urlSchema = z
  .string()
  .trim()
  .min(1, "Enter a URL")
  .max(2048, "URL is too long")
  .transform((v) => (/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`))
  .refine(isHttpUrl, "Enter a valid http(s) URL");

const tagName = z.string().trim().min(1).max(40);
const uuid = z.uuid();

export const createBookmarkSchema = z.object({
  url: urlSchema,
  title: z.string().trim().max(500).optional(),
  description: z.string().trim().max(2000).nullish(),
  notes: z.string().trim().max(10000).nullish(),
  folderId: uuid.nullish(),
  tags: z.array(tagName).max(20).default([]),
  isFavorite: z.boolean().default(false),
  faviconUrl: z.string().max(2048).nullish(),
  thumbnailUrl: z.string().max(2048).nullish(),
  /** Save even if the URL already exists. */
  force: z.boolean().default(false),
});

export const updateBookmarkSchema = z.object({
  url: urlSchema.optional(),
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().trim().max(10000).nullable().optional(),
  folderId: uuid.nullable().optional(),
  tags: z.array(tagName).max(20).optional(),
  isFavorite: z.boolean().optional(),
});

export const moveBookmarkSchema = z.object({ folderId: uuid.nullable() });
export const favoriteSchema = z.object({ isFavorite: z.boolean().optional() });

export const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  folderId: uuid.optional(),
  /** Look inside sub-folders too. */
  includeSubfolders: z.coerce.boolean().default(true),
  unfiled: z.coerce.boolean().optional(),
  tag: z.array(z.string().trim().min(1)).default([]),
  domain: z.string().trim().max(255).optional(),
  favorite: z.coerce.boolean().optional(),
  range: z.enum(["7d", "30d", "90d", "year"]).optional(),
  sort: z.enum(["newest", "oldest", "alpha", "updated", "domain", "visits"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

export function parseListQuery(searchParams: URLSearchParams): ListQuery {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(searchParams.keys())) {
    if (key === "tag") obj.tag = searchParams.getAll("tag");
    else {
      const v = searchParams.get(key);
      if (v !== null && v !== "") obj[key] = v;
    }
  }
  // "false" must stay false (z.coerce.boolean would turn any string into true).
  for (const k of ["favorite", "unfiled", "includeSubfolders"]) {
    if (obj[k] === "false" || obj[k] === "0") obj[k] = false;
  }
  return listQuerySchema.parse(obj);
}
