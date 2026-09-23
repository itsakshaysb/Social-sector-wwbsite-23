# Sector Socials

Single-page site for Sector Socials, an agency that builds outreach automations for companies.

## Live site (GitHub Pages)

**https://itsakshaysb.github.io/Social-sector-wwbsite-23/**

The repo is **public**, so GitHub Pages is free. The deploy workflow turns on **GitHub Actions** Pages automatically (`enablement: true`).

If the URL still returns **404**:

1. Open **Actions** → **Deploy site to GitHub Pages** → confirm the latest run on `v1` is green (not red).
2. Repo **Settings** → **Pages** → **Build and deployment** should show **Source: GitHub Actions** after a successful deploy.
3. Re-run the workflow (**Run workflow** on `v1`) or push any commit to `v1`.

After the workflow succeeds, use the link above (allow 1–2 minutes for the CDN).

## Local preview

```bash
python3 -m http.server 8080
```

http://127.0.0.1:8080
