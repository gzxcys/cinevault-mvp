import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import App from "./App.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import "./index.css";

// Простой роутинг по pathname
const path = window.location.pathname;
const isVerifyPage =
  path.endsWith("/verify-email") || path.includes("/verify-email");
const isResetPage =
  path.endsWith("/reset-password") || path.includes("/reset-password");

let page = <App />;
if (isVerifyPage) {
  page = <VerifyEmailPage />;
} else if (isResetPage) {
  page = <ResetPasswordPage />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isVerifyPage || isResetPage ? page : <AuthProvider>{page}</AuthProvider>}
  </React.StrictMode>,
);
