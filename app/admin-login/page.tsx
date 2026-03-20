import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, getAdminGatePassword, isValidAdminCookie } from "@/lib/services/admin-gate";

type Props = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

function sanitizeNextPath(nextPath: string | undefined): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  if (nextPath === "/admin-login") {
    return "/";
  }

  return nextPath;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const gatePassword = getAdminGatePassword();
  if (!gatePassword) {
    redirect("/");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath = sanitizeNextPath(resolvedSearchParams.next);
  const cookieStore = await cookies();

  if (await isValidAdminCookie(gatePassword, cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    redirect(nextPath);
  }

  return (
    <section className="card auth-card">
      <span className="eyebrow">Operator access</span>
      <h1>Admin login</h1>
      <p>
        This console is restricted. Enter the admin password to access repository connections, delivery logs,
        and rerun controls.
      </p>
      {resolvedSearchParams.error ? (
        <p>
          <small>Error: {resolvedSearchParams.error}</small>
        </p>
      ) : null}
      <form className="auth-form" action="/api/admin-login" method="post">
        <input type="hidden" name="next" value={nextPath} />
        <label className="auth-field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit">Enter admin console</button>
      </form>
      <small>
        Public overview: <Link href="https://git-tweet.abvx.xyz/">git-tweet.abvx.xyz</Link>
      </small>
    </section>
  );
}
