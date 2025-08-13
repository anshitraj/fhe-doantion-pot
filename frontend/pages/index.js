"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
  connectWallet,
  donate,
  readMine,
  readTotal,
  etherscanLinks,
  listenWallet,
  getConnectedAccount,
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
      await refresh(); // show my donations as soon as we connect
    } catch (e) {
      setStatus(e.message || "Failed to connect");
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      // auto-discover authorized account if not set yet
      const a = account || (await getConnectedAccount());
      if (a && a !== account) setAccount(a);

      setTotal(await readTotal());
      setMine(await readMine(a));
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

      // capture the account being used for the tx
      const { account: acc } = await connectWallet();
      if (acc) setAccount(acc);

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

  // React to wallet/account/chain changes
  useEffect(() => {
    const off = listenWallet(
      (acc) => {
        setAccount(acc);
        setTimeout(refresh, 250);
      },
      () => {
        setTimeout(refresh, 250);
      }
    );
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial load: pick up authorized account (if any) and load totals
  useEffect(() => {
    (async () => {
      const a = await getConnectedAccount();
      if (a) setAccount(a);
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const links = etherscanLinks(lastTx);

  return (
    <>
      <Navbar account={account} onConnect={onConnect} />
      <main
        style={{
          minHeight: "100vh",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "min(1100px, 100%)",
            display: "grid",
            gridTemplateColumns: "1fr 0.8fr",
            gap: 24,
          }}
        >
          {/* LEFT */}
          <section
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
              FHE Donation Pot
            </h1>
            <div style={{ opacity: 0.8, marginBottom: 16 }}>Sepolia (Mock)</div>

            {/* Total */}
            <div
              style={{
                padding: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.8 }}>Total Donations</div>
              <div style={{ fontSize: 36, fontWeight: 800 }}>{total} ETH</div>
            </div>

            {/* Mine */}
            <div
              style={{
                padding: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.8 }}>My Donations</div>
              <div style={{ fontSize: 36, fontWeight: 800 }}>{mine} ETH</div>
            </div>

            {/* Donate */}
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.001"
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "inherit",
                }}
              />
              <button
                onClick={onDonate}
                disabled={loading}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "#7c4dff",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                Donate
              </button>
              <button
                onClick={refresh}
                disabled={loading}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "inherit",
                }}
              >
                Refresh
              </button>
            </div>

            {/* Links & status */}
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              <div>
                Contract:{" "}
                <a href={links.contract} target="_blank" rel="noreferrer">
                  {links.contract}
                </a>
              </div>
              {lastTx && (
                <div>
                  Tx:{" "}
                  <a href={links.tx} target="_blank" rel="noreferrer">
                    {links.tx}
                  </a>
                </div>
              )}
              {status && (
                <div style={{ marginTop: 8, opacity: 0.9 }}>{status}</div>
              )}
            </div>
          </section>

          {/* RIGHT */}
          <aside
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h2 style={{ marginTop: 0 }}>About</h2>
            <p style={{ opacity: 0.85 }}>
              Private-by-default donation pot using FHE VM mock on Sepolia. Your
              personal totals are stored and displayed via contract calls.
            </p>
            <ul>
              <li>Connect wallet to see your contributions</li>
              <li>Donations are denominated in ETH</li>
              <li>View transactions on Etherscan</li>
            </ul>

            {!account ? (
              <button
                onClick={onConnect}
                style={{
                  marginTop: 12,
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "#7c4dff",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                Connect
              </button>
            ) : (
              <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
                Connected: {account.slice(0, 6)}…{account.slice(-4)}
              </div>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
