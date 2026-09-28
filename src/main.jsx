import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import SuperAdminPage from "./pages/SuperAdminPage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* HashRouter is required for GitHub Pages (no server-side route fallback) */}
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/superadmin" element={<SuperAdminPage />} />
        <Route path="/payment" element={<PaymentPage />} />
      </Routes>
    </HashRouter>
  </StrictMode>
);
