import { z } from "zod";

const name = z.string().trim().min(1, "Folder name is required").max(120, "Folder name is too long");

export const createFolderSchema = z.object({ name, parentId: z.uuid().nullish() });
export const updateFolderSchema = z.object({
  name: name.optional(),
  parentId: z.uuid().nullable().optional(),
});
export const deleteFolderSchema = z.object({
  strategy: z.enum(["delete_all", "move_to_parent"]),
});
export const tagBodySchema = z.object({ name: z.string().trim().min(1, "Tag name is required").max(40) });
