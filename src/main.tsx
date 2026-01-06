import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import { App } from "@/app/App";
import { AuthProvider } from "@/features/auth/auth";
import { initTheme } from "@/lib/theme";

// Apply theme ASAP to avoid flash
initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
