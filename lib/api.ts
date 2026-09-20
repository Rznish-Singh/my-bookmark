import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import type { User } from "@/lib/db/schema";

type Ctx<P> = { params: Promise<P> };

/** CSRF defence in depth on top of SameSite=Lax: mutations must come from our own origin. */
function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (curl, future extension use bearer auth)
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host && new URL(origin).host !== host) {
    throw new AppError(403, "forbidden", "Cross-origin requests are not allowed.");
  }
}

export function toErrorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, ...err.details } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const where = first?.path.join(".");
    return NextResponse.json(
      { error: { code: "validation_error", message: where ? `${where}: ${first.message}` : (first?.message ?? "Invalid input.") } },
      { status: 400 },
    );
  }
  // Full detail stays on the server; users only see a friendly message.
  console.error("[api] unhandled error", err);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

/** Wraps a route handler: auth, same-origin check, uniform error responses. */
export function authed<P = Record<string, never>>(
  handler: (args: { req: Request; user: User; params: P }) => Promise<Response | unknown>,
) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      assertSameOrigin(req);
      const user = await requireUser();
      const params = (await ctx.params) ?? ({} as P);
      const result = await handler({ req, user, params });
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "bad_request", "Request body must be valid JSON.");
  }
}
