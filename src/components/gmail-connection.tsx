"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { CheckCircle2, Loader2, Mail, RefreshCw, ShieldCheck, Unplug } from "lucide-react";

type Usage = { testAttempts: number; estimatedQuotaUnits: number; successfulTestSends: number; failedTestSends: number };
type Status = { connected: boolean; email?: string | null; usage?: Usage };

export default function GmailConnection({ user }: { user: User }) {
  const [status, setStatus] = useState<Status>({ connected: false });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setError("");
    const token = await user.getIdToken();
    const response = await fetch("/api/gmail/status", { headers: { Authorization: "Bearer " + token }, cache: "no-store" });
    const payload = await response.json() as Status & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Could not load Gmail status.");
    setStatus(payload);
  }, [user]);

  useEffect(() => {
    void loadStatus().catch((err) => setError(err instanceof Error ? err.message : "Could not load Gmail status."));
    const params = new URLSearchParams(window.location.search);
    const result = params.get("gmail");
    if (result === "connected") setMessage("Gmail connected successfully.");
    if (result === "error") setError(params.get("reason") || "Gmail connection failed.");
    if (result) {
      params.delete("gmail");
      params.delete("reason");
      const query = params.toString();
      window.history.replaceState({}, "", query ? "/?" + query : "/");
    }
  }, [loadStatus]);

  async function connect() {
    setBusy("connect"); setError(""); setMessage("");
    try {
      const token = await user.getIdToken(true);
      const response = await fetch("/api/gmail/connect", { method: "POST", headers: { Authorization: "Bearer " + token } });
      const payload = await response.json() as { authorizationUrl?: string; error?: string };
      if (!response.ok || !payload.authorizationUrl) throw new Error(payload.error || "Could not start Gmail authorization.");
      window.location.assign(payload.authorizationUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect Gmail.");
      setBusy("");
    }
  }

  async function sendTest() {
    setBusy("test"); setError(""); setMessage("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/gmail/test-send", { method: "POST", headers: { Authorization: "Bearer " + token } });
      const payload = await response.json() as { sent?: boolean; recipient?: string; quotaUnitsRecorded?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "Test email failed.");
      setMessage("Test email sent to " + payload.recipient + ". Estimated API usage: " + payload.quotaUnitsRecorded + " quota units.");
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test email failed.");
      await loadStatus().catch(() => undefined);
    } finally { setBusy(""); }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Gmail from Outreach OS? This removes the stored refresh token.")) return;
    setBusy("disconnect"); setError(""); setMessage("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/gmail/disconnect", { method: "POST", headers: { Authorization: "Bearer " + token } });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not disconnect Gmail.");
      setStatus({ connected: false });
      setMessage("Gmail disconnected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect Gmail.");
    } finally { setBusy(""); }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111114] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#d4ff6a]"><Mail size={17}/><span className="text-xs font-semibold tracking-wider">GMAIL CONNECTION</span></div>
        <button onClick={() => void loadStatus().catch((err) => setError(err.message))} disabled={Boolean(busy)} aria-label="Refresh Gmail status" className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800"><RefreshCw size={14}/></button>
      </div>
      {status.connected ? (
        <>
          <div className="flex items-center gap-2 text-sm text-zinc-100"><CheckCircle2 size={15} className="text-[#d4ff6a]"/> Connected</div>
          <p className="mt-1 break-all text-xs text-zinc-400">{status.email}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-zinc-900 p-3"><p className="text-[10px] text-zinc-500">Test sends today</p><p className="mt-1 text-xl font-semibold tabular-nums">{status.usage?.testAttempts ?? 0}/3</p></div>
            <div className="rounded-lg bg-zinc-900 p-3"><p className="text-[10px] text-zinc-500">Estimated quota units</p><p className="mt-1 text-xl font-semibold tabular-nums">{(status.usage?.estimatedQuotaUnits ?? 0).toLocaleString()}</p></div>
          </div>
          <p className="mt-2 text-[10px] text-zinc-500">Usage shown here covers Outreach OS test-send requests only, not all Gmail API activity in your Google Cloud project.</p>
          <button onClick={sendTest} disabled={Boolean(busy) || (status.usage?.testAttempts ?? 0) >= 3} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4ff6a] px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-40">
            {busy === "test" ? <Loader2 size={14} className="animate-spin"/> : <Mail size={14}/>} Send test email to myself
          </button>
          <button onClick={disconnect} disabled={Boolean(busy)} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 disabled:opacity-40">
            {busy === "disconnect" ? <Loader2 size={14} className="animate-spin"/> : <Unplug size={14}/>} Disconnect Gmail
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-300">No Gmail account connected.</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Connect the account you want Outreach OS to send from. The app requests permission to send email, not read your inbox.</p>
          <button onClick={connect} disabled={Boolean(busy)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4ff6a] px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-40">
            {busy === "connect" ? <Loader2 size={14} className="animate-spin"/> : <ShieldCheck size={14}/>} Connect Gmail
          </button>
        </>
      )}
      {message && <p className="mt-3 text-xs leading-5 text-emerald-300">{message}</p>}
      {error && <p className="mt-3 text-xs leading-5 text-red-300">{error}</p>}
    </section>
  );
}
