"use client";

import { useEffect, useState } from "react";
import {
  connectWallet,
  donate,
  readMine,
  readTotal,
  etherscanLinks,
  listenWallet,
} from "../lib/contract";

export default function Home() {
  const [account, setAccount] = useState("");
  const [total, setTotal] = useState("0");
  const [mine, setMine] = useState("0");
  const [amount, setAmount] = useState("0.001");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [lastTx, setLastTx] = useState("");

  const onConnect = async () => {
    try {
      const { account } = await connectWallet();
      setAccount(account);
      setStatus("Connected");
    } catch (e) {
      setStatus(e.message || "Failed to connect");
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      setTotal(await readTotal());
      setMine(await readMine(account));
    } catch (e) {
      setStatus(e.message || "Read failed");
    } finally {
      setLoading(false);
    }
  };

  const onDonate = async () => {
    try {
      setLoading(true);
      setStatus("Sending transaction… (check MetaMask)");
      const { hash, wait } = await donate(amount);
      setLastTx(hash);
      setStatus(`Submitted: ${hash.slice(0, 10)}… waiting`);
      const receipt = await wait();
      setStatus(`Confirmed in block ${receipt.blockNumber}`);
      await refresh();
    } catch (e) {
      setStatus(e?.shortMessage || e?.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh on wallet changes
  useEffect(() => {
    const off = listenWallet(
      (acc) => {
        setAccount(acc);
        // when account changes, refresh both
        setTimeout(refresh, 250);
      },
      () => {
        // chain changed; refresh totals
        setTimeout(refresh, 250);
      }
    );
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh(); // load totals at startup even without wallet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const links = etherscanLinks(lastTx);

  return (
    <main style={{ minHeight: "100vh", padding: 24, display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>FHE Donation Pot — Sepolia (Mock)</h1>

      <div style={{ display: "flex", gap: 12 }}>
        {!account ? (
          <button onClick={onConnect} style={{ padding: "8px 16px" }}>Connect MetaMask</button>
        ) : (
          <span style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: 6 }}>
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        )}
        <button onClick={refresh} disabled={loading} style={{ padding: "8px 16px" }}>Refresh</button>
      </div>

      <div style={{ display: "grid", gap: 12, width: "100%", maxWidth: 560 }}>
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Total Donations</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{total} ETH</div>
        </div>
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#666" }}>My Donations</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{mine} ETH</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 560 }}>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.001"
          style={{ flex: 1, padding: 12, border: "1px solid #ccc", borderRadius: 6 }}
        />
        <button onClick={onDonate} disabled={loading} style={{ padding: "8px 16px" }}>Donate</button>
      </div>

      <div style={{ fontSize: 12 }}>
        Contract: <a href={links.contract} target="_blank" rel="noreferrer">{links.contract}</a>
      </div>
      {lastTx && (
        <div style={{ fontSize: 12 }}>
          Tx: <a href={links.tx} target="_blank" rel="noreferrer">{links.tx}</a>
        </div>
      )}
      {status && <div style={{ fontSize: 12, color: "#444", maxWidth: 560, textAlign: "center", wordBreak: "break-all" }}>{status}</div>}
    </main>
  );
}
