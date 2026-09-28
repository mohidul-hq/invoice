import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  isTrialLockActive,
  DEFAULT_TRIAL_LOCK_CONFIG,
} from "../utils/trialLockConfig";
import {
  loadLocalTrialLockCache,
  subscribeTrialLockConfig,
} from "../utils/remoteTrialLock";

function PaymentPage() {
  const [config, setConfig] = useState(() => loadLocalTrialLockCache());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsub = subscribeTrialLockConfig((next) => {
      setConfig({ ...DEFAULT_TRIAL_LOCK_CONFIG, ...next });
      setNow(Date.now());
    });
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => {
      unsub();
      clearInterval(id);
    };
  }, []);

  const locked = isTrialLockActive(config, new Date(now));

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.2),_transparent_55%)]" />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Payment page</h1>
          <p className="text-sm text-gray-600 mt-2">
            Scan the QR code below to top up your account and restore access.
          </p>
        </div>

        {config.qrCodeDataUrl ? (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-inner">
              <img
                src={config.qrCodeDataUrl}
                alt="Payment QR code"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                draggable={false}
              />
            </div>
            {config.paymentInstructions && (
              <p className="text-sm text-gray-600 text-center leading-relaxed">
                {config.paymentInstructions}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center">
            <p className="text-sm text-amber-800">
              Payment QR code is not available yet. Please contact support after
              arranging payment with the administrator.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-center">
          <p className="text-xs text-gray-500">
            {locked
              ? "After payment, wait for the administrator to restore website access."
              : "You can return to the invoice system when ready."}
          </p>
        </div>

        {!locked && (
          <div className="mt-5 text-center">
            <Link
              to="/"
              className="text-sm text-blue-700 hover:text-blue-900 underline underline-offset-2"
            >
              Back to invoice system
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentPage;
