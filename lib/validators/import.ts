import { z } from "zod";

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 MB

export const importBodySchema = z.object({
  html: z.string().min(1, "The file is empty").max(MAX_IMPORT_BYTES, "File is too large (10 MB max)"),
  dryRun: z.boolean().default(false),
  skipDuplicates: z.boolean().default(true),
  mergeFolders: z.boolean().default(true),
});
export type ImportOptions = z.infer<typeof importBodySchema>;

export const metadataBodySchema = z.object({ url: z.string().trim().min(1).max(2048) });

export const authSchema = z.object({
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
export const registerSchema = authSchema.extend({ name: z.string().trim().min(1, "Name is required").max(100) });
