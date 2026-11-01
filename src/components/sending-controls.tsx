"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { Clock3, Loader2, Save, Send } from "lucide-react";

type Settings = { windowStart: string; windowEnd: string; dailyLimit: number; sendingDays: number[]; timezone: string };
const weekdays = [{ n:1, label:"Mon" },{ n:2, label:"Tue" },{ n:3, label:"Wed" },{ n:4, label:"Thu" },{ n:5, label:"Fri" },{ n:6, label:"Sat" },{ n:0, label:"Sun" }];

export default function SendingControls({ user }: { user: User }) {
  const [settings, setSettings] = useState<Settings>({ windowStart:"07:00", windowEnd:"10:00", dailyLimit:5, sendingDays:[1,2,3,4,5], timezone:"Asia/Kolkata" });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function request(path: string, method = "GET", body?: unknown) {
    const token = await user.getIdToken();
    const response = await fetch(path, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type":"application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache:"no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Request failed.");
    return payload;
  }
  useEffect(() => { void request("/api/campaign/settings").then(setSettings).catch(e => setError(e.message)); }, [user]);
  async function save() {
    setBusy("save"); setError(""); setMessage("");
    try { await request("/api/campaign/settings", "PUT", settings); setMessage("Sending preferences saved."); }
    catch(e) { setError(e instanceof Error ? e.message : "Could not save settings."); }
    finally { setBusy(""); }
  }
  async function sendNow() {
    if (!window.confirm("Send approved queued emails now? This will deliver real emails to their recipients and cannot be undone.")) return;
    setBusy("send"); setError(""); setMessage("");
    try {
      const result = await request("/api/queue/send-now", "POST");
      setMessage(`Sent ${result.sent}; failed ${result.failed}; remaining today ${result.remainingToday} of ${result.dailyLimit}.`);
    } catch(e) { setError(e instanceof Error ? e.message : "Could not send queued emails."); }
    finally { setBusy(""); }
  }
  return <section className="rounded-2xl border border-zinc-800 bg-[#111114] p-5">
    <div className="mb-4 flex items-center gap-2 text-[#d4ff6a]"><Clock3 size={17}/><span className="text-xs font-semibold tracking-wider">SENDING CONTROLS · IST</span></div>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-xs text-zinc-400">Window starts<input type="time" value={settings.windowStart} onChange={e=>setSettings(s=>({...s,windowStart:e.target.value}))} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"/></label>
      <label className="text-xs text-zinc-400">Window ends<input type="time" value={settings.windowEnd} onChange={e=>setSettings(s=>({...s,windowEnd:e.target.value}))} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"/></label>
    </div>
    <label className="mt-3 block text-xs text-zinc-400">Daily sending limit (1–50)<input type="number" min="1" max="50" value={settings.dailyLimit} onChange={e=>setSettings(s=>({...s,dailyLimit:Number(e.target.value)}))} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"/></label>
    <div className="mt-3"><p className="mb-2 text-xs text-zinc-400">Scheduled days</p><div className="flex flex-wrap gap-2">{weekdays.map(day=><button key={day.n} type="button" onClick={()=>setSettings(s=>({...s,sendingDays:s.sendingDays.includes(day.n)?s.sendingDays.filter(n=>n!==day.n):[...s.sendingDays,day.n]}))} className={`rounded-md border px-2 py-1 text-[11px] ${settings.sendingDays.includes(day.n)?"border-[#d4ff6a] text-[#d4ff6a]":"border-zinc-700 text-zinc-500"}`}>{day.label}</button>)}</div></div>
    <button onClick={save} disabled={Boolean(busy)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2.5 text-xs text-zinc-200 disabled:opacity-40">{busy==="save"?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Save sending settings</button>
    <div className="my-4 border-t border-zinc-800"/>
    <button onClick={sendNow} disabled={Boolean(busy)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4ff6a] px-3 py-3 text-xs font-semibold text-black disabled:opacity-40">{busy==="send"?<Loader2 size={14} className="animate-spin"/>:<Send size={14}/>} Send approved emails now</button>
    <p className="mt-2 text-[10px] leading-4 text-zinc-500">Manual sending bypasses the time window only. Approval and the daily cap still apply. Sends up to 10 queued emails per click.</p>
    {message && <p className="mt-3 text-xs text-emerald-300">{message}</p>}{error && <p className="mt-3 text-xs text-red-300">{error}</p>}
  </section>;
}
