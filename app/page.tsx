import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <section className="hero-shell">
      <article className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">ABVX release workflow</span>
          <h1>Low-noise GitHub milestones to social posts.</h1>
          <p className="hero-text">
            git-tweet turns public GitHub releases and semver tags into predictable social posts for X and
            Bluesky.
          </p>
          <p className="hero-subtext">
            Conservative release-first rules. No AI. No commit spam. Built for small shipping teams and
            personal release workflows.
          </p>
          <div className="hero-actions">
            <Link className="button-link primary" href="https://github.com/markoblogo/git-tweet">
              View on GitHub
            </Link>
            <Link className="button-link" href="https://lab.abvx.xyz/">
              See ABVX Lab
            </Link>
          </div>
          <ul className="hero-points">
            <li>Release wins over tag for the same version</li>
            <li>Public repos only, activated explicitly</li>
            <li>Logs and rerun support for reliable posting</li>
          </ul>

          <section className="status-strip" aria-label="Product highlights">
            <article className="status-tile">
              <span className="status-label">Release-first</span>
              <strong>Low-noise milestones</strong>
              <small>First release, major version, published release, and tag-only fallback.</small>
            </article>
            <article className="status-tile">
              <span className="status-label">Posting</span>
              <strong>X + Bluesky</strong>
              <small>Shared message format, stable repo links, and conservative hashtag handling.</small>
            </article>
            <article className="status-tile">
              <span className="status-label">Operations</span>
              <strong>Logs + rerun</strong>
              <small>Inspectable delivery history, webhook replay, and manual reruns for missed posts.</small>
            </article>
            <article className="status-tile">
              <span className="status-label">ABVX Lab</span>
              <strong>Part of the tool hub</strong>
              <small>See the broader catalog of AI-assisted coding tools and related utilities.</small>
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
