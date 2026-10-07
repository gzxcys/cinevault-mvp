import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import App from "./App.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import "./index.css";

// Простой роутинг по pathname (без react-router)
const path = window.location.pathname;
const isVerifyPage = path === "/verify-email";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isVerifyPage ? (
      <VerifyEmailPage />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </React.StrictMode>,
);
