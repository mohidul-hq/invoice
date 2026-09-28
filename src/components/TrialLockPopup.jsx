import { Link } from "react-router-dom";

/**
 * Full-screen blocking overlay when free trial / lock schedule is active.
 * Cannot be dismissed by click-outside, Escape, or scroll.
 * Users are directed to the Payment page for the QR code.
 */
function TrialLockPopup({ config }) {
  const { title, message } = config;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-lock-title"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.18),_transparent_55%)]" />

      <div className="relative z-10 w-full max-w-lg mx-3 sm:mx-4 max-h-[100dvh] overflow-y-auto overscroll-contain">
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 my-4">
          <div className="text-center mb-5 sm:mb-6">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-amber-500 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <h2
              id="trial-lock-title"
              className="text-xl sm:text-2xl font-bold text-gray-900 mb-2"
            >
              {title || "Free Trial Expired"}
            </h2>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              {message ||
                "Your free trial period has expired. To regain access, please top up your account."}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-center mb-5">
            <p className="text-xs text-gray-500">
              Website access is locked until payment is confirmed and access is
              restored by the administrator.
            </p>
          </div>

          <Link
            to="/payment"
            className="flex w-full items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Payment page
          </Link>
          <p className="mt-3 text-center text-xs text-gray-500">
            Open the payment page to scan the QR code and top up.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TrialLockPopup;
