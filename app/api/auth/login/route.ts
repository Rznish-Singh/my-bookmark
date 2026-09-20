import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { readJson, toErrorResponse } from "@/lib/api";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { createRateLimiter } from "@/lib/utils/security";
import { authSchema } from "@/lib/validators/import";

const limiter = createRateLimiter(10, 60_000);

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!limiter.check(ip)) throw new AppError(429, "rate_limited", "Too many attempts. Wait a minute and try again.");
    const { email, password } = authSchema.parse(await readJson(req));
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    // Same message for unknown email and wrong password.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError(401, "invalid_credentials", "Incorrect email or password.");
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
