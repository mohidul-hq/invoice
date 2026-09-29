/**
 * Shared cloud config — published for every visitor worldwide.
 * Primary read: same-origin file on GitHub Pages (reliable, no CORS).
 * Fallback read: raw.githubusercontent.com on main.
 * Writes: GitHub Contents API (Super Admin token required).
 */
export const GITHUB_OWNER = "mohidul-hq";
export const GITHUB_REPO = "invoice";
export const GITHUB_BRANCH_MAIN = "main";
export const GITHUB_BRANCH_PAGES = "gh-pages";

/** Source-of-truth copy on main (also used as read fallback) */
export const REMOTE_CONFIG_PATH_MAIN = "remote/lock-config.json";
export const WORKSPACE_DATA_PATH_MAIN = "remote/workspace-data.json";

/** Live file served next to the app on GitHub Pages */
export const REMOTE_CONFIG_PATH_PAGES = "lock-config.json";

export const REMOTE_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH_MAIN}/${REMOTE_CONFIG_PATH_MAIN}`;

export const GITHUB_CONTENTS_API_MAIN = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${REMOTE_CONFIG_PATH_MAIN}`;
export const GITHUB_WORKSPACE_DATA_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${WORKSPACE_DATA_PATH_MAIN}`;
export const WORKSPACE_DATA_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH_MAIN}/${WORKSPACE_DATA_PATH_MAIN}`;

export const GITHUB_CONTENTS_API_PAGES = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${REMOTE_CONFIG_PATH_PAGES}`;

/** Same-origin URL on the deployed site */
export function getPagesConfigUrl() {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${REMOTE_CONFIG_PATH_PAGES}`;
}

/** How often every visitor checks for admin changes (ms) */
export const REMOTE_POLL_INTERVAL_MS = 10000;

export const GITHUB_TOKEN_STORAGE_KEY = "digitalInvoiceGithubToken";
