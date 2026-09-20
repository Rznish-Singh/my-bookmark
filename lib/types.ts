export interface TagDTO { id: string; name: string }

export interface BookmarkDTO {
  id: string;
  title: string;
  url: string;
  domain: string;
  description: string | null;
  notes: string | null;
  faviconUrl: string | null;
  thumbnailUrl: string | null;
  isFavorite: boolean;
  visitCount: number;
  folderId: string | null;
  folderPath: string | null;
  tags: TagDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface FolderDTO {
  id: string;
  parentId: string | null;
  name: string;
  position: number;
  /** Bookmarks directly inside this folder. */
  bookmarkCount: number;
}

export interface FolderNode extends FolderDTO {
  children: FolderNode[];
  /** Bookmarks in this folder and all descendants. */
  totalCount: number;
}

export interface TagWithCount extends TagDTO { count: number }

export type SortKey = "newest" | "oldest" | "alpha" | "updated" | "domain" | "visits";
export type DateRange = "7d" | "30d" | "90d" | "year";

export interface BookmarkPage {
  items: BookmarkDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DuplicateInfo { id: string; title: string; url: string; domain: string }
