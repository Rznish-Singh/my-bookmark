import { z } from "zod";
import { authed } from "@/lib/api";
import { recordVisit } from "@/lib/services/bookmark-service";

export const POST = authed<{ id: string }>(async ({ user, params }) => {
  await recordVisit(user.id, z.uuid().parse(params.id));
  return { ok: true };
});
