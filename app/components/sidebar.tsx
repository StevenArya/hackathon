"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Icon, type IconName } from "./ui-icon";
export const sections = ["Dashboard", "Customers", "Invoices", "Documents", "AI Assistant", "Settings"] as const;
export type Section = typeof sections[number];
const icons: IconName[] = ["grid", "users", "invoice", "folder", "sparkles", "settings"];
export function Sidebar({ active, onNavigate, connected }: { active: Section; onNavigate: (section: Section) => void; connected: boolean }) {
  const [open, setOpen] = useState(false);
  const logoutDialog = useRef<HTMLDialogElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const router = useRouter();

  async function logout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }
  return <>
    <button className="mobile-menu icon-button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? "close" : "menu"} /></button>
    {open && <button className="fixed inset-0 z-30 bg-slate-950/20 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <button type="button" onClick={() => { onNavigate("Dashboard"); setOpen(false); }} aria-label="Creditly dashboard" className="flex items-center gap-2.5 px-3 text-xl font-semibold tracking-tight"><span className="brand-mark"><span /><span /><span /></span>creditly<span className="text-pink-700">.</span></button>
      <div className="workspace"><span className="workspace-avatar">CI</span><div className="flex-1"><p className="text-xs font-semibold">Credit Intelligence</p><p className="mt-1 text-[11px] text-stone-500">Business workspace</p></div><Icon name="chevron" className="!h-3.5 !w-3.5 text-stone-500" /></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation" className="space-y-1">{sections.map((section, index) => <button key={section} onClick={() => { onNavigate(section); setOpen(false); }} aria-current={active === section ? "page" : undefined} className={`nav-item ${active === section ? "nav-active" : ""}`}><Icon name={icons[index]} />{section}{section === "AI Assistant" && <span className="ml-auto rounded border border-pink-100 px-1.5 py-0.5 text-[9px] text-pink-700">BETA</span>}</button>)}<button type="button" className="nav-item" onClick={() => { setLogoutError(""); logoutDialog.current?.showModal(); }}>Logout</button></nav>
      <div className="mt-auto"><div className="sidebar-tip"><Icon name="sparkles" className="text-pink-700" /><p className="mt-3 text-xs font-semibold">A clearer view of your credit</p><p className="mt-2 text-[11px] leading-relaxed text-stone-600">Turn your receivables into your next best action.</p><button onClick={() => onNavigate("AI Assistant")} className="mt-4 flex items-center gap-2 text-xs font-medium text-pink-700">Explore AI Assistant <Icon name="arrow" className="!h-3.5 !w-3.5" /></button></div>
      <div className="mt-5 flex items-center gap-2 border-t border-pink-100 px-2 pt-5 text-[11px] text-stone-600"><span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />{connected ? "Connected to Supabase" : "Connection needs attention"}</div></div>
      
    </aside>
    {/* Native modal traps focus and supports Escape; sign out only after confirmation. */}
    <dialog ref={logoutDialog} aria-labelledby="logout-title" onCancel={event => { if (loggingOut) event.preventDefault(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-pink-100 bg-white p-6 text-stone-700 shadow-xl shadow-pink-200/50 backdrop:bg-black/30">
      <h2 id="logout-title" className="text-lg font-semibold text-pink-500">Are you sure you want to logout?</h2>
      {logoutError && <p role="alert" className="mt-4 text-sm text-red-700">{logoutError}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" autoFocus disabled={loggingOut} onClick={() => logoutDialog.current?.close()} className="secondary-button">Cancel</button>
        <button type="button" disabled={loggingOut} onClick={logout} className="rounded-lg bg-pink-200 px-4 py-2 text-sm font-semibold text-pink-800 hover:bg-pink-300">{loggingOut ? "Logging out..." : "Logout"}</button>
      </div>
    </dialog>
  </>;
}
export function MetricCard({ title, value, detail, icon, tone = "blue", unavailable }: { title: string; value: string; detail: string; icon: IconName; tone?: string; unavailable?: boolean }) {
  return <article className="card min-w-0 p-5"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-medium text-stone-600">{title}</h2><span className={`metric-icon tone-${tone}`}><Icon name={icon} className="!h-4 !w-4" /></span></div><p className="mt-3 text-[clamp(19px,1.65vw,28px)] font-semibold tracking-tight tabular-nums">{unavailable ? "—" : value}</p><p className="mt-3 text-[11px] text-stone-500">{unavailable ? "Data unavailable" : detail}</p></article>;
}

