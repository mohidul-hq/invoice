# Folio — Freelancer Developer OS

Folio is a lightweight workspace for independent software developers. It combines a calm dashboard with the practical tools needed to manage client billing:

- Workspace dashboard with collection, outstanding balance, invoice count, and recent activity
- Freelancer-focused invoice composer with client details and software delivery presets
- Live invoice preview with UPI payment QR code
- Browser print / save-to-PDF workflow
- Local invoice archive with client search and invoice reload
- Lightweight client and project directories derived from workspace activity
- Local login session for private, single-user deployments

## Login

The current single-user login is:

- **Login ID:** `Admin_digital`
- **Password:** `Mohidul`

This is a client-side demo credential. For a production deployment, move authentication to a server-side identity provider and do not ship credentials in the browser bundle.

## Development

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

Invoice history and the login session are stored in the browser's `localStorage`, so data is scoped to the current browser and device.

Workspace data is cached in the browser's `localStorage` for offline use and can sync worldwide through `remote/workspace-data.json` on the configured GitHub repository. Configure a GitHub Personal Access Token in Super Admin before saving data that should be shared across devices. Visitors can read the published workspace data without a token.

## GitHub Pages deployment

The repository deploys automatically through [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) whenever changes are pushed to `main`. In the repository settings, open **Pages** and set **Source** to **GitHub Actions**. The site is then available at:

```text
https://mohidul-hq.github.io/invoice/
```

The deployment workflow publishes the app only. Workspace sync writes data to GitHub through the Contents API, so the Super Admin must save a GitHub token with `repo` permission in the Super Admin page. GitHub Pages is static hosting; it does not provide a database or anonymous write access.

The token is stored separately for each website origin. Save it while using the exact deployed address you use for the app (for example `http://mohidul-hq.me/invoice/`); saving it on `github.io` does not make it available on the custom domain.
