import { Provider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ensureOwnerUser } from "@/lib/services/owner-user";

export function currentXConnectionMode(): string {
  return (process.env.X_CONNECTION_MODE ?? "oauth").toLowerCase();
}

export function hasManualXCredentials(): boolean {
  return Boolean(process.env.X_ACCESS_TOKEN);
}

export async function syncManualXConnection(): Promise<{
  ok: boolean;
  reason?: string;
  providerUser?: string;
}> {
  if (currentXConnectionMode() !== "manual_env") {
    return {
      ok: false,
      reason: `manual sync is not available for mode ${currentXConnectionMode()}`
    };
  }

  const accessToken = process.env.X_ACCESS_TOKEN;
  if (!accessToken) {
    return {
      ok: false,
      reason: "X_ACCESS_TOKEN is not configured"
    };
  }

  const providerUser = process.env.X_ACCOUNT_ID || process.env.X_ACCOUNT_USERNAME || "manual-env-account";
  const user = await ensureOwnerUser();

  await prisma.connectedAccount.upsert({
    where: {
      provider_providerUser: {
        provider: Provider.X,
        providerUser
      }
    },
    update: {
      userId: user.id,
      accessToken
    },
    create: {
      userId: user.id,
      provider: Provider.X,
      providerUser,
      accessToken
    }
  });

  return { ok: true, providerUser };
}

export async function getXConnectionState() {
  const mode = currentXConnectionMode();
  const envConfigured = hasManualXCredentials();

  const account = await prisma.connectedAccount.findFirst({
    where: { provider: Provider.X },
    orderBy: { updatedAt: "desc" }
  });

  const canPost = mode === "manual_env"
    ? envConfigured || Boolean(account?.accessToken)
    : Boolean(account?.accessToken);

  return {
    mode,
    envConfigured,
    canPost,
    account: account
      ? {
          providerUser: account.providerUser,
          updatedAt: account.updatedAt.toISOString(),
          hasAccessToken: Boolean(account.accessToken),
          expiresAt: account.expiresAt ? account.expiresAt.toISOString() : null
        }
      : null,
    reason: canPost ? null : mode === "manual_env" ? "No X credentials configured yet" : "X OAuth is not connected"
  };
}
