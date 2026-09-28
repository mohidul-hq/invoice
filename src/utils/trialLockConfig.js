export const TRIAL_LOCK_STORAGE_KEY = "digitalInvoiceTrialLock";

export const DEFAULT_TRIAL_LOCK_CONFIG = {
  enabled: false,
  startDateTime: "",
  endDateTime: "",
  title: "Free Trial Expired",
  message:
    "Your free trial period has expired. To regain access, please top up your account.",
  paymentInstructions:
    "Scan the QR code below with any UPI app to top up your account. After payment, contact the administrator to restore access.",
  qrCodeDataUrl: "",
};

export function loadTrialLockConfig() {
  try {
    const raw = localStorage.getItem(TRIAL_LOCK_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TRIAL_LOCK_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_TRIAL_LOCK_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_TRIAL_LOCK_CONFIG };
  }
}

export function saveTrialLockConfig(config) {
  const merged = { ...DEFAULT_TRIAL_LOCK_CONFIG, ...config };
  localStorage.setItem(TRIAL_LOCK_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

/**
 * Active when enabled AND current time is within the configured schedule.
 * - No start → treat as already started
 * - No end → stay active until disabled or start is in the future
 */
export function isTrialLockActive(config, now = new Date()) {
  if (!config?.enabled) return false;

  const current = now.getTime();
  const start = config.startDateTime
    ? new Date(config.startDateTime).getTime()
    : null;
  const end = config.endDateTime
    ? new Date(config.endDateTime).getTime()
    : null;

  if (start !== null && Number.isNaN(start)) return false;
  if (end !== null && Number.isNaN(end)) return false;

  if (start !== null && current < start) return false;
  if (end !== null && current > end) return false;

  return true;
}

export function getTrialLockStatusLabel(config, now = new Date()) {
  return isTrialLockActive(config, now) ? "Active" : "Inactive";
}

/** Convert datetime-local value to ISO-friendly local string storage */
export function toDateTimeLocalValue(isoOrLocal) {
  if (!isoOrLocal) return "";
  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
