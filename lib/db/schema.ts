import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  ...timestamps,
});

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Self reference: enables arbitrarily nested folders.
    parentId: uuid("parent_id").references((): AnyPgColumn => folders.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("folders_user_idx").on(t.userId), index("folders_parent_idx").on(t.parentId)],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The service layer decides what happens to bookmarks when a folder is deleted.
    folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    description: text("description"),
    notes: text("notes"),
    faviconUrl: text("favicon_url"),
    thumbnailUrl: text("thumbnail_url"),
    domain: text("domain").notNull(),
    isFavorite: boolean("is_favorite").notNull().default(false),
    visitCount: integer("visit_count").notNull().default(0),
    lastVisitedAt: timestamp("last_visited_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("bookmarks_user_idx").on(t.userId),
    index("bookmarks_folder_idx").on(t.folderId),
    index("bookmarks_normalized_url_idx").on(t.userId, t.normalizedUrl),
    index("bookmarks_created_idx").on(t.userId, t.createdAt),
    index("bookmarks_domain_idx").on(t.userId, t.domain),
    index("bookmarks_favorite_idx").on(t.userId, t.isFavorite),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tags_user_name_uq").on(t.userId, sql`lower(${t.name})`)],
);

export const bookmarkTags = pgTable(
  "bookmark_tags",
  {
    bookmarkId: uuid("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.bookmarkId, t.tagId] }),
    index("bookmark_tags_tag_idx").on(t.tagId),
  ],
);

export const bookmarksRelations = relations(bookmarks, ({ one, many }) => ({
  folder: one(folders, { fields: [bookmarks.folderId], references: [folders.id] }),
  tags: many(bookmarkTags),
}));
export const bookmarkTagsRelations = relations(bookmarkTags, ({ one }) => ({
  bookmark: one(bookmarks, { fields: [bookmarkTags.bookmarkId], references: [bookmarks.id] }),
  tag: one(tags, { fields: [bookmarkTags.tagId], references: [tags.id] }),
}));

export type User = typeof users.$inferSelect;
export type FolderRow = typeof folders.$inferSelect;
export type BookmarkRow = typeof bookmarks.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
