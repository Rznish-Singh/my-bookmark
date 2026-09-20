import "dotenv/config";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { db, sql } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createBookmark } from "@/lib/services/bookmark-service";
import { createFolder } from "@/lib/services/folder-service";

const DEMO_EMAIL = "demo@bookmarkvault.dev";
const DEMO_PASSWORD = "demo1234";

interface Tree { [name: string]: Tree | null }
const TREE: Tree = {
  Development: { React: null, "Next.js": null, Backend: null, "System Design": null },
  AI: { LLM: null, RAG: null, Research: null },
  Design: { "UI Inspiration": null, Resources: null },
  Learning: { DSA: null, SQL: null, Networking: null },
};

const B: Array<[folder: string, title: string, url: string, description: string, tags: string[], fav?: boolean]> = [
  ["Development / React", "React Documentation", "https://react.dev", "The library for web and native user interfaces.", ["react", "docs"], true],
  ["Development / React", "TanStack Query", "https://tanstack.com/query/latest", "Powerful asynchronous state management for the web.", ["react", "data"]],
  ["Development / React", "React Router", "https://reactrouter.com", "Declarative routing for React applications.", ["react"]],
  ["Development / React", "Patterns.dev", "https://www.patterns.dev", "Design, rendering and performance patterns for modern web apps.", ["react", "patterns"]],
  ["Development / Next.js", "Next.js Documentation", "https://nextjs.org/docs", "The React framework for the web.", ["nextjs", "react", "docs"], true],
  ["Development / Next.js", "Vercel Templates", "https://vercel.com/templates", "Starter templates for Next.js and more.", ["nextjs"]],
  ["Development / Next.js", "shadcn/ui", "https://ui.shadcn.com", "Beautifully designed components you can copy and paste into your apps.", ["ui", "react"], true],
  ["Development / Backend", "PostgreSQL Documentation", "https://www.postgresql.org/docs/", "Official manuals for the world's most advanced open source database.", ["postgres", "docs"]],
  ["Development / Backend", "Drizzle ORM", "https://orm.drizzle.team", "Lightweight, performant, type-safe TypeScript ORM.", ["orm", "postgres"]],
  ["Development / Backend", "Node.js Docs", "https://nodejs.org/docs/latest/api/", "API reference for the latest Node.js release.", ["node", "docs"]],
  ["Development / Backend", "Zod", "https://zod.dev", "TypeScript-first schema validation with static type inference.", ["typescript", "validation"]],
  ["Development / System Design", "System Design Primer", "https://github.com/donnemartin/system-design-primer", "Learn how to design large-scale systems.", ["architecture"], true],
  ["Development / System Design", "Designing Data-Intensive Applications", "https://dataintensive.net", "The big ideas behind reliable, scalable, maintainable systems.", ["architecture", "books"]],
  ["AI / LLM", "Anthropic Documentation", "https://docs.claude.com", "Build with Claude: API reference, guides and best practices.", ["ai", "llm", "docs"], true],
  ["AI / LLM", "Prompt Engineering Overview", "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview", "Techniques for writing effective prompts.", ["ai", "prompting"]],
  ["AI / LLM", "Hugging Face", "https://huggingface.co", "The platform where the machine learning community collaborates on models and datasets.", ["ai", "models"]],
  ["AI / RAG", "Building Effective Agents", "https://www.anthropic.com/engineering/building-effective-agents", "Practical patterns for building agents with LLMs.", ["ai", "agents", "rag"]],
  ["AI / RAG", "pgvector", "https://github.com/pgvector/pgvector", "Open-source vector similarity search for Postgres.", ["rag", "postgres"]],
  ["AI / Research", "arXiv cs.CL", "https://arxiv.org/list/cs.CL/recent", "Recent computation and language papers.", ["ai", "research"]],
  ["AI / Research", "Papers with Code", "https://paperswithcode.com", "Machine learning papers with code.", ["ai", "research"]],
  ["Design / UI Inspiration", "Refactoring UI", "https://www.refactoringui.com", "Design tips for developers, from the authors of Tailwind CSS.", ["design", "ui"], true],
  ["Design / UI Inspiration", "Mobbin", "https://mobbin.com", "Explore mobile and web app design patterns.", ["design", "inspiration"]],
  ["Design / UI Inspiration", "Awwwards", "https://www.awwwards.com", "Recognising the talent and effort of the best web designers.", ["design", "inspiration"]],
  ["Design / Resources", "Lucide Icons", "https://lucide.dev", "Beautiful and consistent open-source icon library.", ["design", "icons"]],
  ["Design / Resources", "Tailwind CSS", "https://tailwindcss.com/docs", "A utility-first CSS framework for rapid UI development.", ["css", "docs"]],
  ["Learning / DSA", "NeetCode", "https://neetcode.io", "A curated roadmap of coding interview problems.", ["dsa", "interview"]],
  ["Learning / DSA", "VisuAlgo", "https://visualgo.net", "Visualising data structures and algorithms through animation.", ["dsa"]],
  ["Learning / SQL", "SQLBolt", "https://sqlbolt.com", "Learn SQL with simple, interactive exercises.", ["sql"]],
  ["Learning / SQL", "Use The Index, Luke", "https://use-the-index-luke.com", "A guide to database performance for developers.", ["sql", "postgres"]],
  ["Learning / Networking", "High Performance Browser Networking", "https://hpbn.co", "What every web developer should know about networking and browser performance.", ["networking", "books"]],
  ["Learning / Networking", "MDN: HTTP", "https://developer.mozilla.org/en-US/docs/Web/HTTP", "HTTP is the foundation of data exchange on the Web.", ["networking", "docs"]],
  ["", "Hacker News", "https://news.ycombinator.com", "Links for the intellectually curious, ranked by readers.", ["news"]],
  ["", "Excalidraw", "https://excalidraw.com", "Virtual whiteboard for sketching hand-drawn like diagrams.", ["tools", "design"]],
];

async function main() {
  const [existing] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL));
  if (existing) {
    console.log(`Demo user already exists (${DEMO_EMAIL}). Nothing to do.`);
    await sql.end();
    return;
  }
  const [user] = await db
    .insert(users)
    .values({ email: DEMO_EMAIL, name: "Demo User", passwordHash: await hashPassword(DEMO_PASSWORD) })
    .returning();

  const ids = new Map<string, string>();
  const walk = async (tree: Tree, parentId: string | null, prefix: string) => {
    for (const [name, children] of Object.entries(tree)) {
      const f = await createFolder(user.id, { name, parentId });
      const path = prefix ? `${prefix} / ${name}` : name;
      ids.set(path, f.id);
      if (children) await walk(children, f.id, path);
    }
  };
  await walk(TREE, null, "");

  for (const [folder, title, url, description, tags, fav] of B) {
    await createBookmark(user.id, {
      url, title, description, tags, folderId: folder ? ids.get(folder) : null,
      isFavorite: !!fav, force: true,
    });
  }
  console.log(`Seeded ${ids.size} folders and ${B.length} bookmarks.`);
  console.log(`Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
