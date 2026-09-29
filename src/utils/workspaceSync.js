import {
  GITHUB_WORKSPACE_DATA_API,
  WORKSPACE_DATA_RAW_URL,
} from "../config/remote";
import { getGithubToken } from "./remoteTrialLock";

export const WORKSPACE_STORAGE_KEY = "digitalInvoiceWorkspace";

const EMPTY_WORKSPACE = {
  invoiceHistory: [],
  clients: [],
  projects: [],
};

function normalizeWorkspace(value) {
  if (!value || typeof value !== "object") return { ...EMPTY_WORKSPACE };
  return {
    invoiceHistory: Array.isArray(value.invoiceHistory) ? value.invoiceHistory : [],
    clients: Array.isArray(value.clients) ? value.clients : [],
    projects: Array.isArray(value.projects) ? value.projects : [],
  };
}

export function loadLocalWorkspace() {
  try {
    const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (saved) return normalizeWorkspace(JSON.parse(saved));

    const invoiceHistory = JSON.parse(localStorage.getItem("digitalInvoiceHistory") || "[]");
    return normalizeWorkspace({
      invoiceHistory,
      clients: [...new Set(invoiceHistory.map((invoice) => invoice.clientName).filter(Boolean))],
      projects: [...new Set(invoiceHistory.flatMap((invoice) => (invoice.items || []).map((item) => item.description)).filter(Boolean))],
    });
  } catch (error) {
    console.error("Unable to load local workspace", error);
    return { ...EMPTY_WORKSPACE };
  }
}

function cacheWorkspace(workspace) {
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  localStorage.setItem("digitalInvoiceHistory", JSON.stringify(workspace.invoiceHistory));
}

async function readRemoteWorkspace() {
  const response = await fetch(`${WORKSPACE_DATA_RAW_URL}?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Workspace sync read failed (${response.status})`);
  return normalizeWorkspace(await response.json());
}

export async function loadWorkspace() {
  const local = loadLocalWorkspace();
  try {
    const remote = await readRemoteWorkspace();
    if (remote) {
      cacheWorkspace(remote);
      return remote;
    }
    if (local.invoiceHistory.length || local.clients.length || local.projects.length) {
      await saveWorkspace(local);
    }
  } catch (error) {
    console.warn("Cloud workspace unavailable; using local data.", error);
  }
  return local;
}

function toBase64Utf8(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value, null, 2));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function getRemoteSha(token) {
  const response = await fetch(GITHUB_WORKSPACE_DATA_API, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Workspace sync metadata failed (${response.status})`);
  return (await response.json()).sha;
}

export async function saveWorkspace(workspace) {
  const normalized = normalizeWorkspace(workspace);
  cacheWorkspace(normalized);
  const token = getGithubToken();
  if (!token) return { workspace: normalized, synced: false };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const payload = {
      message: `chore: sync workspace data (${new Date().toISOString()})`,
      content: toBase64Utf8(normalized),
      branch: "main",
    };
    const sha = await getRemoteSha(token);
    if (sha) payload.sha = sha;

    const response = await fetch(GITHUB_WORKSPACE_DATA_API, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(payload),
    });
    if (response.ok) return { workspace: normalized, synced: true };
    if (response.status !== 409 && response.status !== 422) {
      const body = await response.text();
      throw new Error(`Workspace cloud save failed (${response.status}): ${body}`);
    }
  }

  throw new Error("Workspace changed on another device. Please save again.");
}

export function subscribeWorkspace(onChange, intervalMs = 15000) {
  let stopped = false;
  let lastJson = "";
  const tick = async () => {
    if (stopped) return;
    try {
      const workspace = await readRemoteWorkspace();
      if (!workspace) return;
      const serialized = JSON.stringify(workspace);
      if (serialized !== lastJson) {
        lastJson = serialized;
        cacheWorkspace(workspace);
        onChange(workspace);
      }
    } catch (error) {
      console.warn("Workspace sync poll failed.", error);
    }
  };
  tick();
  const id = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearInterval(id);
  };
}
