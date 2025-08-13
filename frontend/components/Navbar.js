"use client";

import { useEffect, useState } from "react";

export default function Navbar({ account, onConnect }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("theme")
        : null;
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      try {
        window.localStorage.setItem("theme", theme);
      } catch (e) {}
    }
  }, [theme]);

  return (
    <header className="navbar">
      <div className="nav-left">
        <span className="brand">FHE DonoPot</span>
        <nav className="links">
          <a href="/" className="link">
            Home
          </a>
          <a
            className="link"
            href="https://sepolia.etherscan.io/"
            target="_blank"
            rel="noreferrer"
          >
            Explorer
          </a>
        </nav>
      </div>
      <div className="nav-right">
        <button
          className="theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        {!account ? (
          <button className="btn primary" onClick={onConnect}>
            Connect
          </button>
        ) : (
          <span className="account">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        )}
      </div>
    </header>
  );
}
