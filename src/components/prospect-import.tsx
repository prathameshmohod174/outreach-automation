"use client";

import { useMemo, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import * as XLSX from "xlsx";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Prospect } from "@/lib/types";

type ImportRow = {
  companyName: string;
  website: string;
  contactName: string;
  role: string;
  email: string;
  instagram: string;
  linkedin: string;
  notes: string;
  rowNumber: number;
};

type Props = {
  userId: string;
  existingProspects: Prospect[];
  onClose: () => void;
  onImported: () => void;
};

const aliases: Record<keyof Omit<ImportRow, "rowNumber">, string[]> = {
  companyName: ["company", "company name", "studio", "studio name", "organisation", "organization", "business", "brand", "prospect"],
  website: ["website", "web site", "url", "company website", "site"],
  contactName: ["contact", "contact name", "person", "person name", "name", "full name"],
  role: ["role", "job title", "designation", "position", "title"],
  email: ["email", "email address", "work email", "contact email"],
  instagram: ["instagram", "instagram url", "instagram profile", "ig"],
  linkedin: ["linkedin", "linkedin url", "linkedin profile"],
  notes: ["notes", "research notes", "description", "comments", "about"]
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normaliseHeader(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}

function normaliseUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "") + url.pathname.replace(/\/$/, "").toLowerCase();
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }
}

function identity(row: Pick<ImportRow, "companyName" | "website" | "contactName" | "email" | "instagram" | "linkedin">) {
  if (row.email) return `email:${normaliseEmail(row.email)}`;
  if (row.linkedin) return `linkedin:${normaliseUrl(row.linkedin)}`;
  if (row.instagram) return `instagram:${normaliseUrl(row.instagram)}`;
  const company = row.companyName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const contact = row.contactName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (contact) return `contact:${company}:${contact}`;
  return `company:${company}:${normaliseUrl(row.website)}`;
}

function parseRows(file: File): Promise<ImportRow[]> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    if (!raw.length) return [];
    const headers = Object.keys(raw[0]);
    const mapped = Object.entries(aliases).map(([field, options]) => {
      const header = headers.find((candidate) => options.includes(normaliseHeader(candidate)));
      return [field, header] as const;
    });
    return raw.map((source, index) => {
      const row: Record<string, string | number> = {};
      for (const [field, header] of mapped) row[field] = header ? clean(source[header]) : "";
      return { ...row, rowNumber: index + 2 } as ImportRow;
    }).filter((row) => Object.values(row).some((value) => typeof value === "string" && value.length > 0));
  });
}

export default function ProspectImport({ userId, existingProspects, onClose, onImported }: Props) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");

  const analysis = useMemo(() => {
    const known = new Set(existingProspects.map((p) => identity({
      companyName: p.companyName || "", website: p.website || "", contactName: p.contactName || "",
      email: p.email || "", instagram: p.instagram || "", linkedin: p.linkedin || ""
    })));
    const seen = new Set<string>();
    const valid: ImportRow[] = [];
    let duplicates = 0;
    let invalid = 0;
    let missingCompany = 0;
    for (const row of rows) {
      if (!row.companyName) { missingCompany++; continue; }
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) { invalid++; continue; }
      const key = identity(row);
      if (known.has(key) || seen.has(key)) { duplicates++; continue; }
      seen.add(key);
      valid.push(row);
    }
    return { valid, duplicates, invalid, missingCompany };
  }, [rows, existingProspects]);

  async function chooseFile(file?: File) {
    if (!file) return;
    setFileError("");
    setResult("");
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(extension || "")) {
      setFileError("Choose a CSV, XLSX or XLS file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("File is larger than 5 MB. Split large lists into smaller files.");
      return;
    }
    try {
      const parsed = await parseRows(file);
      if (!parsed.length) throw new Error("No data rows found in the first worksheet.");
      if (!Object.values(aliases).some((options) => Object.keys(parsed[0]).some((key) => options.includes(normaliseHeader(key))))) {
        throw new Error("Could not recognise the column headers. Use a Company, Studio or Company Name column.");
      }
      if (!parsed.some((row) => row.companyName)) throw new Error("A company column is required. Try: Company, Company Name or Studio.");
      setRows(parsed);
      setFileName(file.name);
    } catch (error) {
      setRows([]);
      setFileName("");
      setFileError(error instanceof Error ? error.message : "Could not read this file.");
    }
  }

  async function importProspects() {
    if (!db || !analysis.valid.length) return;
    setSaving(true);
    setFileError("");
    try {
      const target = collection(db, "users", userId, "prospects");
      for (let i = 0; i < analysis.valid.length; i += 1) {
        const row = analysis.valid[i];
        await addDoc(target, {
          companyName: row.companyName.slice(0, 200),
          website: row.website,
          contactName: row.contactName,
          role: row.role,
          email: normaliseEmail(row.email),
          instagram: row.instagram,
          linkedin: row.linkedin,
          notes: row.notes,
          status: "new",
          createdAt: Date.now(),
          importSource: fileName,
          importedAt: Date.now()
        });
      }
      setResult(`Imported ${analysis.valid.length} prospect${analysis.valid.length === 1 ? "" : "s"} successfully.`);
      onImported();
      setRows([]);
      setFileName("");
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Import stopped. Some earlier rows may already have been saved; re-importing will detect them as duplicates.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4">
      <section className="my-8 w-full max-w-3xl rounded-2xl border border-zinc-700 bg-[#111114] p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div><p className="mb-2 text-[10px] font-semibold tracking-[.2em] text-[#d4ff6a]">PROSPECT INTAKE</p><h2 className="text-xl font-semibold">Import a prospect list</h2><p className="mt-1 text-xs text-zinc-500">Upload a CSV or Excel file. Review duplicates before saving.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800" aria-label="Close import"><X size={17}/></button>
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 px-5 py-8 text-center hover:border-[#d4ff6a]/60">
          <Upload size={22} className="mb-3 text-[#d4ff6a]"/>
          <span className="text-sm font-medium">{fileName || "Choose a CSV or Excel file"}</span>
          <span className="mt-1 text-xs text-zinc-500">CSV, XLSX or XLS · up to 5 MB · first worksheet only</span>
          <input type="file" accept=".csv,.xlsx,.xls,text/csv" className="sr-only" onChange={(e) => chooseFile(e.target.files?.[0])}/>
        </label>
        <div className="mt-4 rounded-lg border border-zinc-800 p-4">
          <p className="mb-2 text-xs font-semibold text-zinc-300">Recognised columns</p>
          <p className="text-xs leading-5 text-zinc-500">Company / Studio, Website, Contact Name, Role, Email, Instagram, LinkedIn, Notes. Header names can vary; unrecognised columns are ignored.</p>
          <button type="button" onClick={() => {
            const sample = "Company Name,Website,Contact Name,Role,Email,Instagram,LinkedIn,Notes\nExample Studio,https://example.com,Alex Producer,Producer,,https://instagram.com/example,,Independent film production";
            const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a"); anchor.href = url; anchor.download = "prospect-import-template.csv"; anchor.click(); URL.revokeObjectURL(url);
          }} className="mt-3 text-xs text-[#d4ff6a] underline underline-offset-4">Download CSV template</button>
        </div>
        {rows.length > 0 && <div className="mt-5">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-zinc-900 p-3"><p className="text-xl font-semibold">{rows.length}</p><p className="text-[10px] text-zinc-500">Rows detected</p></div>
            <div className="rounded-lg bg-zinc-900 p-3"><p className="text-xl font-semibold text-[#d4ff6a]">{analysis.valid.length}</p><p className="text-[10px] text-zinc-500">Ready to import</p></div>
            <div className="rounded-lg bg-zinc-900 p-3"><p className="text-xl font-semibold">{analysis.duplicates}</p><p className="text-[10px] text-zinc-500">Duplicates skipped</p></div>
            <div className="rounded-lg bg-zinc-900 p-3"><p className="text-xl font-semibold">{analysis.invalid + analysis.missingCompany}</p><p className="text-[10px] text-zinc-500">Invalid / missing company</p></div>
          </div>
          <p className="mb-2 text-xs font-medium text-zinc-300">Import preview</p>
          <div className="max-h-48 overflow-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-zinc-900 text-zinc-500"><tr><th className="p-2">Company</th><th className="p-2">Contact</th><th className="p-2">Email</th><th className="p-2">Status</th></tr></thead><tbody>{rows.slice(0, 30).map((row) => {
              const isValid = analysis.valid.includes(row);
              return <tr key={row.rowNumber} className="border-t border-zinc-800"><td className="max-w-44 truncate p-2">{row.companyName || "—"}</td><td className="max-w-36 truncate p-2 text-zinc-400">{row.contactName || "—"}</td><td className="max-w-44 truncate p-2 text-zinc-400">{row.email || "—"}</td><td className="p-2">{isValid ? <span className="text-[#d4ff6a]">Ready</span> : <span className="text-zinc-500">Skipped</span>}</td></tr>;
            })}</tbody></table>
          </div>
          {rows.length > 30 && <p className="mt-2 text-[10px] text-zinc-500">Showing first 30 rows in preview.</p>}
        </div>}
        {fileError && <p className="mt-4 flex items-start gap-2 text-xs text-red-300"><AlertCircle size={15} className="shrink-0"/>{fileError}</p>}
        {result && <p className="mt-4 flex items-center gap-2 text-xs text-[#d4ff6a]"><CheckCircle2 size={15}/>{result}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">Close</button><button type="button" onClick={importProspects} disabled={saving || !analysis.valid.length} className="inline-flex items-center gap-2 rounded-lg bg-[#d4ff6a] px-5 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">{saving ? <><Loader2 size={15} className="animate-spin"/> Importing…</> : <><FileSpreadsheet size={15}/> Import {analysis.valid.length} prospects</>}</button></div>
      </section>
    </div>
  );
}
