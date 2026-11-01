"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import type { User } from "firebase/auth";
import { Clock3 } from "lucide-react";
import { db } from "@/lib/firebase";

type QueueItem = {
  id: string;
  companyName: string;
  recipient: string;
  subject: string;
  status: "queued" | "sending" | "sent" | "failed" | "cancelled";
  approvedAt: string;
};

export default function ApprovedQueue({ user }: { user: User }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!db) return;
    const queueQuery = query(collection(db, "users", user.uid, "sendQueue"), orderBy("createdAt", "desc"));
    return onSnapshot(queueQuery, (snapshot) => {
      setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as QueueItem)));
      setError("");
    }, (reason) => setError(reason.message));
  }, [user]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111114] p-5">
      <div className="mb-4 flex items-center gap-2 text-[#d4ff6a]">
        <Clock3 size={17}/>
        <span className="text-xs font-semibold tracking-wider">APPROVED SEND QUEUE</span>
      </div>
      <p className="mb-3 text-xs leading-5 text-zinc-500">Approved emails wait here until you choose to send them. Manual sending still requires approval and respects your daily cap.</p>
      {error && <p className="text-xs text-red-300">{error}</p>}
      {!error && items.length === 0 && <p className="text-xs text-zinc-500">No approved emails in the queue.</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border-t border-zinc-800 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-zinc-200">{item.companyName}</p>
              <span className="shrink-0 rounded-full border border-zinc-700 px-2 py-1 text-[9px] uppercase tracking-wider text-zinc-400">{item.status}</span>
            </div>
            <p className="mt-1 break-all text-[11px] text-zinc-500">{item.recipient}</p>
            <p className="mt-1 truncate text-[11px] text-zinc-400">{item.subject}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
