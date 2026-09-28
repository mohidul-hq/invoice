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
