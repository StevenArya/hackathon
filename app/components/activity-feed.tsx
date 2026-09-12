import { currency, daysUntil, isOverdue, statusLabel, type Customer, type Invoice } from "@/src/lib/credit";
import { Icon, type IconName } from "./ui-icon";
export function ActivityFeed({ customers, invoices, today, unavailable }: { customers: Customer[]; invoices: Invoice[]; today: string; unavailable?: boolean }) {
  const items: { id: string; title: string; description: string; icon: IconName; tone: string; tag: string }[] = [...invoices].sort((a, b) => Number(isOverdue(b, today)) - Number(isOverdue(a, today)) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")).map(i => {
    const name = customers.find(c => c.id === i.customer_id)?.name ?? "Customer";
    const days = daysUntil(i.due_date, today);
    if (i.status === "paid") return { id: i.id, title: `${i.invoice_number} is marked paid`, description: `${name} · ${currency(Number(i.amount))}`, icon: "check", tone: "green", tag: "Paid" };
    if (isOverdue(i, today)) return { id: i.id, title: days !== null && days < 0 ? `Invoice ${i.invoice_number} is ${-days} days overdue` : `Invoice ${i.invoice_number} is overdue`, description: `${name} · ${currency(Number(i.amount))}`, icon: "alert", tone: "red", tag: "Overdue" };
    return { id: i.id, title: days === 0 ? `${i.invoice_number} is due today` : days !== null ? `${i.invoice_number} is due in ${days} days` : `${i.invoice_number} awaits payment`, description: `${name} · ${currency(Number(i.amount))}`, icon: "clock", tone: "amber", tag: "Upcoming" };
  });
  customers.filter(c => c.status !== "good").forEach(c => items.push({ id: c.id, title: `${c.name} has ${statusLabel[c.status]} credit status`, description: `${c.customer_code} · Current customer risk`, icon: "users", tone: "blue", tag: "Customer" }));
  return <div className="max-h-[380px] overflow-y-auto overscroll-contain" tabIndex={0} role="region" aria-label="Activity feed entries">{!items.length && <p className="px-6 py-14 text-center text-sm text-stone-500">{unavailable ? "Activity is unavailable while disconnected." : "No invoice or customer activity to show yet."}</p>}{items.map(item => <div key={item.id} className="activity-item"><span className={`activity-icon tone-${item.tone}`}><Icon name={item.icon} className="!h-4 !w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-medium leading-5">{item.title}</p><p className="mt-1 text-[11px] text-stone-500">{item.description}</p></div><span className={`status-badge tone-${item.tone}`}>{item.tag}</span></div>)}</div>;
}

