import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
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
