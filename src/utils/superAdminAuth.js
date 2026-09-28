export const SUPER_ADMIN_STORAGE_KEY = "digitalInvoiceSuperAdminAuth";

/** Separate credentials from the invoice login */
export const SUPER_ADMIN_USERNAME = "SuperAdmin_Mohidul";
export const SUPER_ADMIN_PASSWORD = "Mohidul@2005";

export function isSuperAdminAuthenticated() {
  return localStorage.getItem(SUPER_ADMIN_STORAGE_KEY) === "true";
}

export function setSuperAdminAuthenticated(value) {
  if (value) {
    localStorage.setItem(SUPER_ADMIN_STORAGE_KEY, "true");
  } else {
    localStorage.removeItem(SUPER_ADMIN_STORAGE_KEY);
  }
}

export function verifySuperAdminCredentials(username, password) {
  return (
    username === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD
  );
}
