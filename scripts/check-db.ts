import { config } from "dotenv";
config({ override: true });
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) return console.log("RESULT: DATABASE_URL is empty. The .env file is missing, misnamed (.env.txt?) or not in the project root.");

  let u: URL;
  try { u = new URL(url); } catch { return console.log("RESULT: DATABASE_URL is not a valid URL. Encode special characters in the password (@ -> %40, # -> %23, / -> %2F)."); }
  console.log("host    :", u.host);
  console.log("user    :", decodeURIComponent(u.username));
  console.log("database:", u.pathname.slice(1));
  console.log("ssl     :", /sslmode=require/.test(url) ? "require" : "NOT set (add ?sslmode=require for Supabase)");

  const sql = postgres(url, { max: 1, connect_timeout: 10, prepare: false });
  try {
    await sql`select 1`;
    console.log("connect : OK");
    const t = await sql`select to_regclass('public.users') as t`;
    console.log("users tbl:", t[0].t ? "exists" : "MISSING -> run: npm run db:migrate");
    if (t[0].t) {
      const n = await sql`select count(*)::int as n from users`;
      console.log("users    :", n[0].n, n[0].n === 0 ? "-> run: npm run db:seed" : "(seed/register already done)");
    }
  } catch (e) {
    const err = e as { code?: string; message?: string; cause?: { code?: string; message?: string } };
    const c = err.cause ?? err;
    console.log("connect : FAILED");
    console.log("code    :", c.code ?? err.code);
    console.log("message :", c.message ?? err.message);
    const m = `${c.code} ${c.message}`;
    if (/ENOTFOUND/.test(m)) console.log("HINT: host name doesn't resolve. Use the Session pooler host (…pooler.supabase.com), not db.<ref>.supabase.co.");
    else if (/Tenant or user not found/i.test(m)) console.log("HINT: wrong region in host, or user is not postgres.<project-ref>. Re-copy from Supabase > Connect > Session pooler.");
    else if (/password authentication/i.test(m)) console.log("HINT: wrong database password. Reset it in Supabase > Project Settings > Database.");
    else if (/ETIMEDOUT|ECONNREFUSED/.test(m)) console.log("HINT: network blocked. Try another network / disable VPN, or the port (5432 vs 6543).");
    else if (/ssl|certificate/i.test(m)) console.log("HINT: add ?sslmode=require to the URL.");
  } finally {
    await sql.end({ timeout: 2 });
  }
}
main();
