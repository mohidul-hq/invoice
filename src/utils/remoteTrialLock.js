import {
  DEFAULT_TRIAL_LOCK_CONFIG,
  TRIAL_LOCK_STORAGE_KEY,
} from "./trialLockConfig";
import {
  GITHUB_BRANCH_MAIN,
  GITHUB_BRANCH_PAGES,
  GITHUB_CONTENTS_API_MAIN,
  GITHUB_CONTENTS_API_PAGES,
  GITHUB_TOKEN_STORAGE_KEY,
  REMOTE_POLL_INTERVAL_MS,
  REMOTE_RAW_URL,
  getPagesConfigUrl,
} from "../config/remote";

function cacheLocal(config) {
  try {
    localStorage.setItem(TRIAL_LOCK_STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore quota errors */
  }
}

function readLocalCache() {
  try {
    const raw = localStorage.getItem(TRIAL_LOCK_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TRIAL_LOCK_CONFIG };
    return { ...DEFAULT_TRIAL_LOCK_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_TRIAL_LOCK_CONFIG };
  }
}

function normalize(data) {
  if (!data || typeof data !== "object") {
    return { ...DEFAULT_TRIAL_LOCK_CONFIG };
  }
  const merged = { ...DEFAULT_TRIAL_LOCK_CONFIG, ...data };
  // Coerce enabled in case it was saved as a string
  merged.enabled = merged.enabled === true || merged.enabled === "true";
  return merged;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store", mode: "cors" });
  if (res.status === 404) return { missing: true };
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} for ${url}`);
  }
  const data = await res.json();
  return { data };
}

/**
 * Public read — every visitor worldwide.
 * 1) Same-origin GitHub Pages file (best)
 * 2) raw.githubusercontent.com fallback
 */
export async function fetchRemoteTrialLockConfig() {
  const cacheBust = `t=${Date.now()}`;

  // 1) Same-origin on GitHub Pages
  try {
    const pagesUrl = `${getPagesConfigUrl()}?${cacheBust}`;
    const result = await fetchJson(pagesUrl);
    if (!result.missing && result.data) {
      const config = normalize(result.data);
      cacheLocal(config);
      return config;
    }
  } catch (err) {
    console.warn("Pages lock-config fetch failed, trying GitHub raw…", err);
  }

  // 2) Fallback: main branch raw file
  const rawUrl = `${REMOTE_RAW_URL}?${cacheBust}`;
  const raw = await fetchJson(rawUrl);
  if (raw.missing) {
    return { ...DEFAULT_TRIAL_LOCK_CONFIG, _remoteMissing: true };
  }
  const config = normalize(raw.data);
  cacheLocal(config);
  return config;
}

export async function loadTrialLockConfigAsync() {
  try {
    return await fetchRemoteTrialLockConfig();
  } catch (err) {
    console.warn("Remote trial lock unavailable, using local cache.", err);
    return readLocalCache();
  }
}

export function getGithubToken() {
  return localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) || "";
}

export function setGithubToken(token) {
  const trimmed = (token || "").trim();
  if (trimmed) {
    localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
  }
}

async function getRemoteFileMeta(apiUrl, branch, token) {
  const res = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub read failed (${res.status}): ${body}`);
  }
  return res.json();
}

function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

async function putRemoteFile(apiUrl, branch, token, contentBase64, message) {
  const meta = await getRemoteFileMeta(apiUrl, branch, token);
  const payload = {
    message,
    content: contentBase64,
    branch,
  };
  if (meta?.sha) payload.sha = meta.sha;

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloud save failed on ${branch} (${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * Super Admin save — writes to GitHub Pages (live) + main (backup).
 */
export async function saveRemoteTrialLockConfig(config) {
  const token = getGithubToken();
  if (!token) {
    throw new Error(
      "Add a GitHub Personal Access Token in Super Admin to sync changes worldwide."
    );
  }

  const merged = normalize(config);
  delete merged._remoteMissing;

  const content = toBase64Utf8(JSON.stringify(merged, null, 2));
  const stamp = new Date().toISOString();

  // Primary: gh-pages so every visitor reads it from the same website origin
  await putRemoteFile(
    GITHUB_CONTENTS_API_PAGES,
    GITHUB_BRANCH_PAGES,
    token,
    content,
    `chore: update live lock-config (${stamp})`
  );

  // Backup on main (for repo history + raw fallback)
  try {
    await putRemoteFile(
      GITHUB_CONTENTS_API_MAIN,
      GITHUB_BRANCH_MAIN,
      token,
      content,
      `chore: update trial lock config (${stamp})`
    );
  } catch (err) {
    console.warn("Saved to GitHub Pages but main backup failed:", err);
  }

  cacheLocal(merged);
  return merged;
}

export function subscribeTrialLockConfig(
  onChange,
  intervalMs = REMOTE_POLL_INTERVAL_MS
) {
  let stopped = false;
  let lastJson = "";

  const tick = async () => {
    if (stopped) return;
    try {
      const config = await fetchRemoteTrialLockConfig();
      const serialized = JSON.stringify(config);
      if (serialized !== lastJson) {
        lastJson = serialized;
        onChange(config);
      }
    } catch (err) {
      console.warn("Trial lock poll failed:", err);
    }
  };

  tick();
  const id = setInterval(tick, intervalMs);

  return () => {
    stopped = true;
    clearInterval(id);
  };
}

export { REMOTE_POLL_INTERVAL_MS, readLocalCache as loadLocalTrialLockCache };
