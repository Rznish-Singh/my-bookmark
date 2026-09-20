import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { readJson, toErrorResponse } from "@/lib/api";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { createRateLimiter } from "@/lib/utils/security";
import { registerSchema } from "@/lib/validators/import";

const limiter = createRateLimiter(5, 60_000);

export async function POST(req: Request) {
  try {
    if (process.env.ALLOW_REGISTRATION === "false") {
      throw new AppError(403, "registration_closed", "Sign-up is closed. Ask the owner for an account.");
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!limiter.check(ip)) throw new AppError(429, "rate_limited", "Too many attempts. Wait a minute and try again.");
    const { email, password, name } = registerSchema.parse(await readJson(req));
    const [user] = await db
      .insert(users)
      .values({ email, name, passwordHash: await hashPassword(password) })
      .onConflictDoNothing()
      .returning();
    if (!user) throw new AppError(409, "email_taken", "An account with this email already exists.");
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
