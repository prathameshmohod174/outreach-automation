"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { Aperture, CheckCircle2, FileSpreadsheet, Loader2, LogOut, Plus, Search, Send, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { auth, db, firebaseConfigured, googleProvider } from "@/lib/firebase";
import type { Prospect } from "@/lib/types";
import ProspectImport from "@/components/prospect-import";
import GmailConnection from "@/components/gmail-connection";
import ApprovedQueue from "@/components/approved-queue";
import SendingControls from "@/components/sending-controls";

const initialForm = { companyName: "", website: "", contactName: "", role: "", email: "", instagram: "", linkedin: "", notes: "" };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProspectId, setEditingProspectId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [draftingId, setDraftingId] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [senderName, setSenderName] = useState("Prathamesh Mohod");
  const [senderRole, setSenderRole] = useState("Freelance Cinematographer, Videographer & Editor");
  const [portfolioUrl, setPortfolioUrl] = useState("https://prathameshmohod174.github.io/portfolio/");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) { setProspects([]); return; }
    const q = query(collection(db, "users", user.uid, "prospects"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => setProspects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Prospect))), (e) => setError(e.message));
  }, [user]);

  const filtered = useMemo(() => prospects.filter((p) => [p.companyName, p.contactName, p.email, p.role].join(" ").toLowerCase().includes(search.toLowerCase())), [prospects, search]);
  const stats = [
    { label: "Prospects", value: prospects.length, icon: Users },
    { label: "Drafts ready", value: prospects.filter((p) => p.status === "draft_ready").length, icon: Sparkles },
    { label: "Approved", value: prospects.filter((p) => p.status === "approved").length, icon: CheckCircle2 },
    { label: "Sent", value: prospects.filter((p) => p.status === "sent").length, icon: Send }
  ];

  function openProspectEditor(prospect: Prospect) {
    setEditingProspectId(prospect.id);
    setForm({
      companyName: prospect.companyName || "",
      website: prospect.website || "",
      contactName: prospect.contactName || "",
      role: prospect.role || "",
      email: prospect.email || "",
      instagram: prospect.instagram || "",
      linkedin: prospect.linkedin || "",
      notes: prospect.notes || ""
    });
    setError("");
    setShowForm(true);
  }

  function closeProspectEditor() {
    setShowForm(false);
    setEditingProspectId(null);
    setForm(initialForm);
  }

  async function addProspect(e: React.FormEvent) {
    e.preventDefault(); if (!user || !db) return;
    setSaving(true); setError("");
    try {
      if (editingProspectId) {
        await updateDoc(doc(db, "users", user.uid, "prospects", editingProspectId), {
          ...form,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, "users", user.uid, "prospects"), { ...form, status: "new", createdAt: Date.now(), createdAtServer: serverTimestamp() });
      }
      closeProspectEditor();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save prospect."); }
    finally { setSaving(false); }
  }

  function openDraftEditor(prospect: Prospect) {
    setDraftingId(prospect.id);
    setDraftError("");
    setDraftSubject(prospect.draft?.subject || "");
    setDraftBody(prospect.draft?.body || "");
  }

  async function generateDraft(prospect: Prospect) {
    if (!user || !db) return;
    setDraftBusy(true);
    setDraftError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          companyName: prospect.companyName,
          contactName: prospect.contactName || "",
          role: prospect.role || "",
          website: prospect.website || "",
          senderName,
          senderRole,
          portfolioUrl
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Draft generation failed.");
      setDraftSubject(payload.subject);
      setDraftBody(payload.body);
      await updateDoc(doc(db, "users", user.uid, "prospects", prospect.id), {
        draft: {
          subject: payload.subject,
          body: payload.body,
          personalisationBasis: payload.personalisationBasis || [],
          claimsToVerify: payload.claimsToVerify || [],
          status: "draft",
          generatedAt: new Date().toISOString()
        },
        status: "draft_ready"
      });
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Draft generation failed.");
    } finally {
      setDraftBusy(false);
    }
  }

  async function saveDraft(prospect: Prospect, status: "draft" | "approved" | "rejected") {
    if (!user || !db || !draftSubject.trim() || !draftBody.trim()) return;
    setDraftBusy(true);
    setDraftError("");
    try {
      if (status === "approved") {
        const token = await user.getIdToken();
        const response = await fetch("/api/queue/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ prospectId: prospect.id, subject: draftSubject.trim(), body: draftBody.trim() })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not approve and queue this email.");
      } else {
        await updateDoc(doc(db, "users", user.uid, "prospects", prospect.id), {
          draft: {
            ...(prospect.draft || {}),
            subject: draftSubject.trim(),
            body: draftBody.trim(),
            status,
            editedAt: new Date().toISOString()
          },
          status: status === "rejected" ? "rejected" : "draft_ready"
        });
      }
      if (status !== "draft") setDraftingId("");
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Could not save draft.");
    } finally {
      setDraftBusy(false);
    }
  }

  async function login() {
    if (!auth) return;
    try { await signInWithPopup(auth, googleProvider); } catch (err) { setError(err instanceof Error ? err.message : "Sign-in failed."); }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-zinc-800/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="#" className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d4ff6a] text-black"><Aperture size={21}/></span><span className="text-sm font-semibold tracking-[.22em]">OUTREACH<span className="text-[#d4ff6a]"> OS</span></span></a>
          <div className="flex items-center gap-3">{user ? <><span className="hidden text-xs text-zinc-400 sm:block">{user.email}</span><button onClick={() => auth && signOut(auth)} className="rounded-lg border border-zinc-700 p-2 text-zinc-300 hover:bg-zinc-800" aria-label="Sign out"><LogOut size={16}/></button></> : <button onClick={login} disabled={!firebaseConfigured} className="rounded-lg bg-[#d4ff6a] px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">Connect Google</button>}</div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-12">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><p className="mb-3 text-[11px] font-semibold tracking-[.28em] text-[#d4ff6a]">CREATIVE PARTNERSHIPS / WORKSPACE</p><h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Good work deserves<br/><span className="text-zinc-500">the right introduction.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">Manage your creative contacts, prepare direct introductions and follow up on approved outreach.</p></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => setShowImport(true)} disabled={!user} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"><FileSpreadsheet size={16}/> Import list</button><button onClick={() => setShowForm(true)} disabled={!user} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4ff6a] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#e2ff9a] disabled:cursor-not-allowed disabled:opacity-40"><Plus size={17}/> Add prospect</button></div>
        </div>

        {!firebaseConfigured && <div className="mb-7 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200"><strong>Firebase setup required.</strong> Copy .env.example to .env.local and add your Firebase web app configuration before signing in.</div>}
        {error && <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">{error}</div>}

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(({label,value,icon:Icon}) => <div key={label} className="rounded-2xl border border-zinc-800 bg-[#111114] p-5"><div className="mb-5 flex items-center justify-between text-xs text-zinc-500"><span>{label}</span><Icon size={17}/></div><p className="text-3xl font-semibold tracking-tight">{value}</p></div>)}</div>

        <div className="grid gap-5 lg:grid-cols-[1fr_310px]">
          <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111114]">
            <div className="flex flex-col gap-3 border-b border-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Prospect list</h2><p className="mt-1 text-xs text-zinc-500">Your creative contacts and studios</p></div><label className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2"><Search size={15} className="text-zinc-500"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prospects" className="w-40 bg-transparent text-xs outline-none placeholder:text-zinc-600"/></label></div>
            {!user ? <div className="px-6 py-16 text-center"><Users className="mx-auto mb-4 text-zinc-600" size={27}/><p className="font-medium">Connect your Google account to begin</p><p className="mt-2 text-sm text-zinc-500">Prospects are stored privately in your Firebase workspace.</p></div> : filtered.length === 0 ? <div className="px-6 py-16 text-center"><FileSpreadsheet className="mx-auto mb-4 text-zinc-600" size={27}/><p className="font-medium">No prospects yet</p><p className="mt-2 text-sm text-zinc-500">Add your first creative studio, producer or collaborator.</p></div> : <div className="divide-y divide-zinc-800/80">{filtered.map((p) => <div key={p.id} className="border-b border-zinc-800/80 px-5 py-4 last:border-0"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-medium">{p.companyName}</p><p className="mt-1 truncate text-xs text-zinc-500">{[p.contactName,p.role,p.email].filter(Boolean).join(" · ") || "Contact details not added"}</p><p className="mt-1 truncate text-[11px] text-zinc-600">{p.website || "Website not added"}</p></div><div className="flex flex-wrap items-center gap-2"><span className="w-fit rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-400">{p.status.replace("_"," ")}</span><button onClick={() => openProspectEditor(p)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-[#d4ff6a]/60">Edit details</button><button onClick={() => openDraftEditor(p)} className="rounded-lg border border-[#d4ff6a]/40 px-3 py-2 text-xs text-[#d4ff6a]">{p.draft ? "Edit email draft" : "Create email"}</button></div></div></div>)}</div>}
          </section>

          <aside className="space-y-4">
            {user && <GmailConnection user={user}/> }
            {user && <ApprovedQueue user={user}/> }
            {user && <SendingControls user={user}/> }
            <div className="rounded-2xl border border-zinc-800 bg-[#111114] p-5"><div className="mb-3 flex items-center gap-2 text-[#d4ff6a]"><ShieldCheck size={17}/><span className="text-xs font-semibold tracking-wider">SENDING SAFETY</span></div><ul className="space-y-3 text-xs leading-5 text-zinc-400"><li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#d4ff6a]"/> Manual approval required</li><li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#d4ff6a]"/> Duplicate and opt-out checks</li><li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#d4ff6a]"/> No guessed email addresses</li></ul></div>
            
          </aside>
        </div>
      </section>

      {draftingId && user && (() => {
        const prospect = prospects.find((item) => item.id === draftingId);
        if (!prospect) return null;
        return <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/80 p-4"><section className="my-8 w-full max-w-3xl rounded-2xl border border-zinc-700 bg-[#111114] p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><p className="mb-2 text-[10px] font-semibold tracking-[.2em] text-[#d4ff6a]">DRAFT WORKSHOP</p><h2 className="text-xl font-semibold">{prospect.companyName}</h2><p className="mt-1 text-xs text-zinc-500">Fixed one-line introduction · review and edit before approval</p></div><button onClick={() => setDraftingId("")} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"><X size={17}/></button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-zinc-400">Sender name<input value={senderName} onChange={(e)=>setSenderName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"/></label><label className="text-xs text-zinc-400">Sender role<input value={senderRole} onChange={(e)=>setSenderRole(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"/></label><label className="text-xs text-zinc-400 sm:col-span-2">Portfolio URL<input value={portfolioUrl} onChange={(e)=>setPortfolioUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"/></label></div><div className="mt-4 flex flex-wrap justify-end gap-2"><button onClick={()=>generateDraft(prospect)} disabled={draftBusy} className="inline-flex items-center gap-2 rounded-lg bg-[#d4ff6a] px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">{draftBusy ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} Create email</button></div>{(draftSubject || draftBody) && <div className="mt-5 border-t border-zinc-800 pt-5"><p className="mb-3 text-xs font-semibold tracking-wide text-[#d4ff6a]">EDITABLE EMAIL DRAFT</p><label className="block text-xs text-zinc-400">Subject<input value={draftSubject} onChange={(e)=>setDraftSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"/></label><label className="mt-3 block text-xs text-zinc-400">Message<textarea value={draftBody} onChange={(e)=>setDraftBody(e.target.value)} rows={9} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm leading-6 text-zinc-100"/></label>{prospect.draft?.claimsToVerify?.length ? <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"><p className="mb-1 text-xs font-semibold text-amber-300">Verify before approval</p><ul className="list-inside list-disc text-xs text-amber-100/80">{prospect.draft.claimsToVerify.map((claim,i)=><li key={i}>{claim}</li>)}</ul></div> : null}<p className="mt-3 text-[11px] text-zinc-500">Saving edits does not approve the message. Approval is a separate action. No email will be sent.</p><div className="mt-4 flex flex-wrap justify-end gap-2"><button onClick={()=>saveDraft(prospect,"draft")} disabled={draftBusy || !draftSubject.trim() || !draftBody.trim()} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 disabled:opacity-40">Save edits</button><button onClick={()=>saveDraft(prospect,"rejected")} disabled={draftBusy} className="rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-300 disabled:opacity-40">Reject</button><button onClick={()=>saveDraft(prospect,"approved")} disabled={draftBusy || !draftSubject.trim() || !draftBody.trim()} className="rounded-lg bg-[#d4ff6a] px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"><CheckCircle2 size={13} className="mr-1 inline"/> Approve draft</button></div></div>}{draftError && <p className="mt-3 text-xs text-red-300">{draftError}</p>}</section></div>;
      })()}
      {showImport && user && <ProspectImport userId={user.uid} existingProspects={prospects} onClose={() => setShowImport(false)} onImported={() => undefined}/>}
      {showForm && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4"><form onSubmit={addProspect} className="my-8 w-full max-w-2xl rounded-2xl border border-zinc-700 bg-[#111114] p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-xl font-semibold">{editingProspectId ? "Edit prospect" : "Add a prospect"}</h2><p className="mt-1 text-xs text-zinc-500">Update company, website and contact details. Your existing prospect record will be preserved.</p></div><button type="button" onClick={closeProspectEditor} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"><X size={17}/></button></div><div className="grid gap-4 sm:grid-cols-2">{([{key:"companyName",label:"Company / studio *",required:true},{key:"website",label:"Website"},{key:"contactName",label:"Contact person"},{key:"role",label:"Role / designation"},{key:"email",label:"Email address",type:"email"},{key:"instagram",label:"Instagram URL"},{key:"linkedin",label:"LinkedIn URL"}] as const).map((field) => <label key={field.key} className="block"><span className="mb-1.5 block text-xs text-zinc-400">{field.label}</span><input required={"required" in field} type={"type" in field ? field.type : "text"} value={form[field.key]} onChange={(e) => setForm({...form,[field.key]:e.target.value})} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-[#d4ff6a]"/></label>)}<label className="block sm:col-span-2"><span className="mb-1.5 block text-xs text-zinc-400">Notes (optional)</span><textarea rows={3} value={form.notes} onChange={(e) => setForm({...form,notes:e.target.value})} placeholder="Any context you want to keep with this contact..." className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-[#d4ff6a]"/></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeProspectEditor} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">Cancel</button><button disabled={saving || !user} className="rounded-lg bg-[#d4ff6a] px-5 py-2 text-sm font-semibold text-black disabled:opacity-50">{saving ? "Saving..." : editingProspectId ? "Save changes" : "Save prospect"}</button></div></form></div>}
    </main>
  );
}
