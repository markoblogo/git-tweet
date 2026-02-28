export default function ConnectGitHubPage() {
  return (
    <section className="card">
      <h1>Connect GitHub</h1>
      <p>GitHub OAuth and webhook setup entrypoint.</p>
      <p>
        <a href="/api/connect/github/start">Start GitHub OAuth (stub)</a>
      </p>
      <small>
        TODO: register OAuth app and webhook in GitHub; store account token in connected_accounts.
      </small>
    </section>
  );
}
