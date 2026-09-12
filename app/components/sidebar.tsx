"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./ui-icon";
export const sections = ["Dashboard", "Customers", "Invoices", "Documents", "AI Assistant", "Settings"] as const;
export type Section = typeof sections[number];
const icons: IconName[] = ["grid", "users", "invoice", "folder", "sparkles", "settings"];
export function Sidebar({ active, onNavigate, connected }: { active: Section; onNavigate: (section: Section) => void; connected: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="mobile-menu icon-button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? "close" : "menu"} /></button>
    {open && <button className="fixed inset-0 z-30 bg-slate-950/20 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <Link href="/" className="flex items-center gap-2.5 px-3 text-xl font-semibold tracking-tight"><span className="brand-mark"><span /><span /><span /></span>creditly<span className="text-blue-600">.</span></Link>
      <div className="workspace"><span className="workspace-avatar">CI</span><div className="flex-1"><p className="text-xs font-semibold">Credit Intelligence</p><p className="mt-1 text-[11px] text-slate-400">Business workspace</p></div><Icon name="chevron" className="!h-3.5 !w-3.5 text-slate-400" /></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation" className="space-y-1">{sections.map((section, index) => <button key={section} onClick={() => { onNavigate(section); setOpen(false); }} aria-current={active === section ? "page" : undefined} className={`nav-item ${active === section ? "nav-active" : ""}`}><Icon name={icons[index]} />{section}{section === "AI Assistant" && <span className="ml-auto rounded border border-blue-100 px-1.5 py-0.5 text-[9px] text-blue-600">BETA</span>}</button>)}</nav>
      <div className="mt-auto"><div className="sidebar-tip"><Icon name="sparkles" className="text-blue-600" /><p className="mt-3 text-xs font-semibold">A clearer view of your credit</p><p className="mt-2 text-[11px] leading-relaxed text-slate-500">Turn your receivables into your next best action.</p><button onClick={() => onNavigate("AI Assistant")} className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600">Explore AI Assistant <Icon name="arrow" className="!h-3.5 !w-3.5" /></button></div>
      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 px-2 pt-5 text-[11px] text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />{connected ? "Connected to Supabase" : "Connection needs attention"}</div></div>
    </aside>
  </>;
}
export function MetricCard({ title, value, detail, icon, tone = "blue", unavailable }: { title: string; value: string; detail: string; icon: IconName; tone?: string; unavailable?: boolean }) {
  return <article className="card min-w-0 p-5"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-medium text-slate-500">{title}</h2><span className={`metric-icon tone-${tone}`}><Icon name={icon} className="!h-4 !w-4" /></span></div><p className="mt-3 text-[clamp(19px,1.65vw,28px)] font-semibold tracking-tight tabular-nums">{unavailable ? "—" : value}</p><p className="mt-3 text-[11px] text-slate-400">{unavailable ? "Data unavailable" : detail}</p></article>;
}

