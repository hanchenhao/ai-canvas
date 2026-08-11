import type {} from "../theme";
import type {} from "../emotion";
import type {} from "../material-ui";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import InitColorSchemeScript from "@mui/system/InitColorSchemeScript";
import ThemeNodetool from "../components/themes/ThemeNodetool";
import { LoadingSpinner } from "../components/ui_primitives";
import { TRPCProvider } from "../trpc/Provider";
import { loadRuntimeConfig } from "../lib/runtimeConfig";
import { initSupabaseFromConfig } from "../lib/supabaseClient";
import useAuth from "../stores/useAuth";
import { PRODUCT_NAME } from "../studio/productConfig";
import AdminApp from "./AdminApp";
import "../styles/vars.css";
import "../styles/index.css";

document.title = `${PRODUCT_NAME} 管理后台`;

const bootstrap = loadRuntimeConfig().then(async (config) => {
  initSupabaseFromConfig(config);
  await useAuth.getState().initialize();
});

const AdminBootstrap = () => {
  const [ready, setReady] = useState(false);
  const authState = useAuth((state) => state.state);
  useEffect(() => {
    let active = true;
    void bootstrap.finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  if (!ready || authState === "init" || authState === "loading") {
    return <LoadingSpinner size="large" />;
  }
  return <AdminApp />;
};

const root = document.getElementById("admin-root");
if (!root) throw new Error("Admin root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <TRPCProvider>
      <InitColorSchemeScript attribute="class" defaultMode="dark" />
      <ThemeProvider theme={ThemeNodetool} defaultMode="dark">
        <CssBaseline />
        <AdminBootstrap />
      </ThemeProvider>
    </TRPCProvider>
  </React.StrictMode>
);
