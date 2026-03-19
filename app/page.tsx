import Image from "next/image";
import Link from "next/link";
import { Provider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getBlueskyConnectionState } from "@/lib/services/bluesky-connection";
import { getXConnectionState } from "@/lib/services/x-connection";

export default async function HomePage() {
  const [githubAccount, xState, blueskyState, activeRepos] = await Promise.all([
    prisma.connectedAccount.findFirst({
      where: {
        provider: Provider.GITHUB,
        accessToken: { not: null }
      },
      orderBy: { updatedAt: "desc" }
    }),
    getXConnectionState(),
    getBlueskyConnectionState(),
    prisma.repositorySettings.count({
      where: { isActive: true }
    })
  ]);

  return (
    <section className="hero-shell">
      <article className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Personal workflow stage</span>
          <h1>Low-noise GitHub milestones to social posts.</h1>
          <p className="hero-text">
            git-tweet watches the public repositories you explicitly activate and publishes only meaningful
            release milestones: first releases, major versions, standard releases, and semver tags.
          </p>
          <p className="hero-subtext">
            Predictable rules. No AI. No commit spam. Full logs and rerun support.
          </p>
          <div className="hero-actions">
            <Link className="button-link primary" href="/connect/github">
              Connect GitHub
            </Link>
            <Link className="button-link" href="/logs">
              View Logs
            </Link>
          </div>
          <ul className="hero-points">
            <li>Public repos only</li>
            <li>Inactive by default after sync</li>
            <li>Release wins over tag for the same version</li>
          </ul>

          <section className="status-strip" aria-label="Connection status">
            <article className="status-tile">
              <span className="status-label">GitHub</span>
              <strong>{githubAccount ? "Connected" : "Not connected"}</strong>
              <small>{githubAccount ? githubAccount.providerUser : "Use Connect GitHub"}</small>
            </article>
            <article className="status-tile">
              <span className="status-label">X</span>
              <strong>{xState.canPost ? "Ready" : "Needs attention"}</strong>
              <small>{xState.account?.providerUser ?? xState.reason ?? "Use Connect X"}</small>
            </article>
            <article className="status-tile">
              <span className="status-label">Bluesky</span>
              <strong>{blueskyState.canPost ? "Ready" : "Needs attention"}</strong>
              <small>{blueskyState.handle ?? blueskyState.reason ?? "Use Connect Bluesky"}</small>
            </article>
            <article className="status-tile">
              <span className="status-label">Active repos</span>
              <strong>{activeRepos}</strong>
              <small>Ready for release posts</small>
            </article>
          </section>
        </div>

        <div className="hero-media">
          <div className="hero-logo">
            <Image src="/assets/logo.png" alt="git-tweet logo" width={96} height={96} priority />
          </div>
          <Image
            className="hero-cover"
            src="/assets/og.png"
            alt="git-tweet cover"
            width={860}
            height={450}
            priority
          />
        </div>
      </article>
    </section>
  );
}
