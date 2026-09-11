import { Provider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { refreshXOAuthToken } from "@/lib/services/x-oauth";
import { decryptToken, encryptToken } from "@/lib/services/token-vault";

type ConnectedAccount = {
  id: string;
  provider: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  updatedAt: Date;
};

export async function latestValidXAccessToken(
  accounts: ConnectedAccount[],
  now = new Date()
): Promise<string | null | undefined> {
  const account = accounts
    .filter((candidate) => candidate.provider === Provider.X)
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0];
  if (!account?.accessToken) return account?.accessToken;

  const accessToken = decryptToken(account.accessToken);
  const expiresSoon = account.expiresAt && account.expiresAt.getTime() <= now.getTime() + 60_000;
  if (!expiresSoon || !account.refreshToken) return accessToken;

  const refreshed = await refreshXOAuthToken(decryptToken(account.refreshToken));
  await prisma.connectedAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encryptToken(refreshed.accessToken),
      refreshToken: refreshed.refreshToken
        ? encryptToken(refreshed.refreshToken)
        : account.refreshToken,
      expiresAt: refreshed.expiresIn
        ? new Date(now.getTime() + refreshed.expiresIn * 1000)
        : null
    }
  });
  return refreshed.accessToken;
}
