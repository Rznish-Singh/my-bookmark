import { authed } from "@/lib/api";
import { listDomains } from "@/lib/services/bookmark-service";

export const GET = authed(async ({ user }) => ({ domains: await listDomains(user.id) }));
