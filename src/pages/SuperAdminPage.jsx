import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getTrialLockStatusLabel,
  isTrialLockActive,
  toDateTimeLocalValue,
  DEFAULT_TRIAL_LOCK_CONFIG,
} from "../utils/trialLockConfig";
import {
  isSuperAdminAuthenticated,
  setSuperAdminAuthenticated,
  verifySuperAdminCredentials,
} from "../utils/superAdminAuth";
import {
  getGithubToken,
  loadLocalTrialLockCache,
  loadTrialLockConfigAsync,
  saveRemoteTrialLockConfig,
  setGithubToken,
  subscribeTrialLockConfig,
} from "../utils/remoteTrialLock";

function SuperAdminPage() {
  const [isAuthed, setIsAuthed] = useState(() => isSuperAdminAuthenticated());
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [config, setConfig] = useState(() => loadLocalTrialLockCache());
  const [draft, setDraft] = useState(() => ({
    ...DEFAULT_TRIAL_LOCK_CONFIG,
    ...loadLocalTrialLockCache(),
  }));
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewNow, setPreviewNow] = useState(new Date());
  const [githubTokenInput, setGithubTokenInput] = useState(() => getGithubToken());
  const [syncLabel, setSyncLabel] = useState("Checking cloud…");

  useEffect(() => {
    const id = setInterval(() => setPreviewNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isAuthed) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadTrialLockConfigAsync();
        if (cancelled) return;
        setConfig(loaded);
        setDraft({ ...DEFAULT_TRIAL_LOCK_CONFIG, ...loaded });
        setSyncLabel(
          loaded._remoteMissing
            ? "Cloud file not created yet — save once to publish worldwide"
            : "Synced from cloud"
        );
      } catch {
        if (!cancelled) setSyncLabel("Cloud unreachable — showing local cache");
      }
    })();

    const unsub = subscribeTrialLockConfig((next) => {
      setConfig(next);
      setDraft((prev) => {
        // Keep in-progress edits; only refresh if not dirty would be complex —
        // refresh status config only for status badge
        return prev;
      });
      setSyncLabel("Live cloud updates active (every ~12s)");
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [isAuthed]);

  const statusLabel = getTrialLockStatusLabel(draft, previewNow);
  const willBeActive = isTrialLockActive(draft, previewNow);

  const handleLogin = (e) => {
    e.preventDefault();
    if (verifySuperAdminCredentials(authForm.username, authForm.password)) {
      setSuperAdminAuthenticated(true);
      setIsAuthed(true);
      setAuthError("");
      setAuthForm({ username: "", password: "" });
    } else {
      setAuthError("Invalid Super Admin username or password.");
      setAuthForm({ username: "", password: "" });
    }
  };

  const handleLogout = () => {
    setSuperAdminAuthenticated(false);
    setIsAuthed(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDraft((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSaveMessage("");
  };

  const handleQrUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSaveMessage("Please upload an image file for the QR code.");
      return;
    }
    if (file.size > 400 * 1024) {
      setSaveMessage("QR image should be under 400KB for reliable cloud sync.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, qrCodeDataUrl: String(reader.result) }));
      setSaveMessage("");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQr = () => {
    setDraft((prev) => ({ ...prev, qrCodeDataUrl: "" }));
    setSaveMessage("");
  };

  const handleSaveToken = () => {
    setGithubToken(githubTokenInput);
    setSaveMessage(
      githubTokenInput.trim()
        ? "GitHub token saved on this device. You can now publish lock changes worldwide."
        : "GitHub token cleared."
    );
  };

  const persist = async (next) => {
    setSaving(true);
    setSaveMessage("Publishing to cloud for all users…");
    try {
      setGithubToken(githubTokenInput);
      const saved = await saveRemoteTrialLockConfig(next);
      setConfig(saved);
      setDraft({ ...DEFAULT_TRIAL_LOCK_CONFIG, ...saved });
      setSyncLabel("Published to cloud — users update within ~15 seconds");
      setSaveMessage(
        "Saved to cloud. All users worldwide will see this within about 15 seconds."
      );
      return saved;
    } catch (err) {
      setSaveMessage(err?.message || "Failed to save to cloud.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      draft.startDateTime &&
      draft.endDateTime &&
      new Date(draft.endDateTime) < new Date(draft.startDateTime)
    ) {
      setSaveMessage("End date/time must be after the start date/time.");
      return;
    }
    try {
      await persist(draft);
    } catch {
      /* message already set */
    }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
            <p className="text-sm text-gray-600 mt-1">
              Sign in to control website lock and payment settings
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={authForm.username}
                onChange={(e) =>
                  setAuthForm((p) => ({ ...p, username: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-700"
                placeholder="Super Admin user ID"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm((p) => ({ ...p, password: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-700"
                placeholder="Super Admin password"
                required
                autoComplete="current-password"
              />
            </div>
            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {authError}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-medium hover:bg-slate-900"
            >
              Sign in
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-500">
            This portal is separate from the invoice login.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-200 bg-slate-800 text-white">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Super Admin</h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Website lock & payment QR — synced worldwide
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/payment"
                className="text-sm bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg"
              >
                View payment page
              </Link>
              <Link
                to="/"
                className="text-sm bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded-lg"
              >
                Invoice app
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-900">Cloud sync</p>
              <p className="text-xs text-blue-800 mt-1">{syncLabel}</p>
              <p className="text-xs text-blue-700 mt-2 leading-relaxed">
                Changes publish to the live website file so every visitor is locked
                within about 10–15 seconds. Paste a GitHub Personal Access Token
                (classic) with <strong>repo</strong> scope. Token stays only on
                this device.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={githubTokenInput}
                  onChange={(e) => setGithubTokenInput(e.target.value)}
                  placeholder="ghp_… GitHub token"
                  className="flex-1 px-3 py-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={handleSaveToken}
                  className="bg-blue-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-800"
                >
                  Save token
                </button>
              </div>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 text-xs text-blue-800 underline"
              >
                Create token on GitHub →
              </a>
            </div>

            <div
              className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-2 ${
                willBeActive
                  ? "bg-red-50 border-red-200"
                  : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Current popup status
                </p>
                <p className="text-xs text-gray-500">
                  Applies to all visitors after cloud save
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                  willBeActive
                    ? "bg-red-100 text-red-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    willBeActive ? "bg-red-500" : "bg-emerald-500"
                  }`}
                />
                {statusLabel}
              </span>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                name="enabled"
                checked={!!draft.enabled}
                onChange={handleChange}
                className="mt-1 w-4 h-4 accent-slate-800"
              />
              <span>
                <span className="block text-sm font-medium text-gray-800">
                  Enable website lock popup
                </span>
                <span className="block text-xs text-gray-500">
                  When enabled and saved, every user on the internet sees the
                  lock within about 15 seconds.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activation start
                </label>
                <input
                  type="datetime-local"
                  name="startDateTime"
                  value={toDateTimeLocalValue(draft.startDateTime)}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activation end
                </label>
                <input
                  type="datetime-local"
                  name="endDateTime"
                  value={toDateTimeLocalValue(draft.endDateTime)}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-700 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Popup title
              </label>
              <input
                type="text"
                name="title"
                value={draft.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Popup message
              </label>
              <textarea
                name="message"
                value={draft.message}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-700 resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment instructions
              </label>
              <textarea
                name="paymentInstructions"
                value={draft.paymentInstructions}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-700 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment QR code
              </label>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-36 h-36 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                  {draft.qrCodeDataUrl ? (
                    <img
                      src={draft.qrCodeDataUrl}
                      alt="QR preview"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 px-2 text-center">
                      No QR uploaded
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white file:text-sm file:font-medium hover:file:bg-slate-900"
                  />
                  {draft.qrCodeDataUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveQr}
                      className="text-sm text-red-600 hover:text-red-800 self-start"
                    >
                      Remove QR code
                    </button>
                  )}
                  <p className="text-xs text-gray-500">
                    Keep under 400KB. Shown on the payment page for all users.
                  </p>
                </div>
              </div>
            </div>

            {saveMessage && (
              <div
                className={`text-sm px-3 py-2 rounded-lg border ${
                  saveMessage.includes("Saved to cloud") ||
                  saveMessage.includes("token saved") ||
                  saveMessage.includes("Publishing")
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                {saveMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-slate-900 disabled:opacity-60"
              >
                {saving ? "Publishing…" : "Save & publish worldwide"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  try {
                    await persist({ ...draft, enabled: false });
                  } catch {
                    /* message set */
                  }
                }}
                className="bg-gray-700 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-60"
              >
                Disable lock worldwide
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Cloud enabled flag: {config.enabled ? "yes" : "no"}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminPage;
