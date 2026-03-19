# Security Policy

Thanks for helping keep **git-tweet** secure.

## Supported versions

Security fixes are applied to the latest version on the `main` branch.
Older tags/releases may not receive backported fixes.

## Reporting a vulnerability

Please **do not** open public issues for security-sensitive reports.

Use GitHub’s private reporting flow instead:
- Go to the repository’s **Security** tab
- Click **Report a vulnerability** (GitHub Security Advisories)

If that option is not available, you can contact the maintainer privately:
- Email: **abv-creative@proton.me**  
  (Replace with your preferred address.)

### What to include

- Clear description of the vulnerability and potential impact
- Steps to reproduce (PoC if available)
- Affected endpoints/files (e.g., OAuth callbacks, webhook ingestion)
- Any suggested fix or mitigation

Please **do not include secrets**:
OAuth tokens, client secrets, webhook secrets, or personal data.

## Scope

In-scope examples:
- OAuth flow issues (state/PKCE handling, token leakage)
- Webhook verification bypasses
- Authentication/authorization flaws
- Unsafe logging of secrets
- Vulnerabilities that could cause unauthorized posting or data exposure

Out of scope examples:
- Social engineering
- Physical access attacks
- Denial-of-service from unrealistic traffic volumes

## Coordinated disclosure

After receiving a report, we aim to:
1) Acknowledge receipt
2) Investigate and validate the issue
3) Patch and publish a fix on `main`
4) Provide credit (optional) if you want it
