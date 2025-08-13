"use client";

import { useEffect } from "react";
import "../styles/globals.css";

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const theme = getInitialTheme();
    document.documentElement.setAttribute("data-theme", theme);
  }, []);
  return <Component {...pageProps} />;
}
