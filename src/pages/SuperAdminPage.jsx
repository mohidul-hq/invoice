import { useState } from "react";
import { Link } from "react-router-dom";
import {
  getGithubToken,
  setGithubToken,
  validateGithubToken,
} from "../utils/remoteTrialLock";
import {
  isSuperAdminAuthenticated,
  setSuperAdminAuthenticated,
  verifySuperAdminCredentials,
} from "../utils/superAdminAuth";

function SuperAdminPage() {
  const [isAuthed, setIsAuthed] = useState(() => isSuperAdminAuthenticated());
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [githubTokenInput, setGithubTokenInput] = useState(() => getGithubToken());
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  const handleLogin = (event) => {
    event.preventDefault();
    if (verifySuperAdminCredentials(authForm.username, authForm.password)) {
      setSuperAdminAuthenticated(true);
      setIsAuthed(true);
      setAuthError("");
      return;
    }
    setAuthError("Invalid Super Admin username or password.");
  };

  const handleSaveToken = async () => {
    const token = githubTokenInput.trim();
    if (!token) {
      setGithubToken("");
      setMessage("GitHub token cleared. Cloud sync is disabled on this browser.");
      return;
    }

    setChecking(true);
    setMessage("Checking GitHub token and repository write access…");
    try {
      await validateGithubToken(token);
      setGithubToken(token);
      setMessage(
        `Token verified and saved for ${window.location.origin}. Invoices, clients, and projects can now sync worldwide.`
      );
    } catch (error) {
      setGithubToken("");
      setMessage(error instanceof Error ? error.message : "Token verification failed.");
    } finally {
      setChecking(false);
    }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-8">
        <form onSubmit={handleLogin} className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4">
          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 bg-slate-800 text-white rounded-full flex items-center justify-center text-2xl mb-4">◆</div>
            <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
            <p className="text-sm text-gray-600 mt-1">Configure cloud sync</p>
          </div>
          <label className="block text-sm font-medium text-gray-700">
            User ID
            <input
              type="text"
              value={authForm.username}
              onChange={(event) => setAuthForm((prev) => ({ ...prev, username: event.target.value }))}
              className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-700"
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Password
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
              className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-700"
              autoComplete="current-password"
              required
            />
          </label>
          {authError && <p className="text-sm text-red-600">{authError}</p>}
          <button type="submit" className="w-full bg-slate-800 text-white rounded-lg py-2.5 font-medium hover:bg-slate-700">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-8">
      <main className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Settings</p>
            <h1 className="text-2xl font-bold text-slate-900">Cloud sync</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/" className="px-3 py-2 rounded-lg bg-white text-slate-700 text-sm">Invoice app</Link>
            <button
              type="button"
              onClick={() => { setSuperAdminAuthenticated(false); setIsAuthed(false); }}
              className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-slate-900">GitHub repository sync</h2>
          <p className="mt-2 text-sm text-slate-600">
            This token allows the app to save shared invoice, client, and project data to the repository.
          </p>
          <label className="block mt-5 text-sm font-medium text-slate-700">
            GitHub Personal Access Token
            <input
              type="password"
              value={githubTokenInput}
              onChange={(event) => setGithubTokenInput(event.target.value)}
              placeholder="Paste your token"
              className="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-700"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveToken}
            disabled={checking}
            className="mt-3 bg-slate-800 text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {checking ? "Checking…" : "Verify and save token"}
          </button>
          {message && <p className="mt-4 text-sm text-slate-700 break-words">{message}</p>}
          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 space-y-2">
            <p>Use a classic token with <strong>repo</strong> scope, or a fine-grained token with repository Contents read/write access.</p>
            <p>The token is stored only in this browser and separately for each website address.</p>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-slate-900 underline"
            >
              Open GitHub token settings
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

export default SuperAdminPage;
