export type Customer = { id: string; customer_code: string; name: string; bank_ref_number: string | null; status: "good" | "level_1" | "level_2" | "danger" };
export type Invoice = { id: string; customer_id: string; invoice_number: string; amount: number; issue_date: string | null; due_date: string | null; status: "unpaid" | "paid" | "overdue" };
export const currency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
export const compact = (value: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
export const statusLabel = { good: "Good", level_1: "Level 1", level_2: "Level 2", danger: "Danger" };
export function daysUntil(date: string | null, today: string) {
  return date ? Math.round((Date.parse(date.slice(0, 10)) - Date.parse(today)) / 86400000) : null;
}
export function isOverdue(invoice: Invoice, today: string) {
  return invoice.status !== "paid" && (invoice.status === "overdue" || (daysUntil(invoice.due_date, today) ?? 0) < 0);
}
export const sum = (invoices: Invoice[]) => invoices.reduce((total, invoice) => total + Number(invoice.amount), 0);
export function summarize(customers: Customer[], invoices: Invoice[], today: string) {
  const outstanding = invoices.filter(i => i.status !== "paid");
  const overdue = outstanding.filter(i => isOverdue(i, today));
  const dueSoon = outstanding.filter(i => !isOverdue(i, today) && i.due_date && (daysUntil(i.due_date, today) ?? -1) >= 0 && (daysUntil(i.due_date, today) ?? 8) <= 7);
  const attention = customers.filter(c => c.status !== "good" || overdue.some(i => i.customer_id === c.id));
  const rank = { good: 0, level_1: 1, level_2: 2, danger: 3 };
  const highest = [...attention].sort((a, b) => rank[b.status] - rank[a.status] || sum(overdue.filter(i => i.customer_id === b.id)) - sum(overdue.filter(i => i.customer_id === a.id)))[0];
  return { outstanding, overdue, dueSoon, attention, highest, total: sum(outstanding), totalOverdue: sum(overdue) };
}
