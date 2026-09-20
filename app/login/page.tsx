import { redirect } from "next/navigation";
import { AuthForm } from "@/components/layout/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <AuthForm allowRegistration={process.env.ALLOW_REGISTRATION !== "false"} demoHint={process.env.NODE_ENV !== "production"} />
    </main>
  );
}
