import { adminCustomers } from "@/lib/site-data";
import { formatCurrency } from "@/lib/format";

export default function AdminCustomersPage() {
  return (
    <div className="soft-panel rounded-[1.8rem] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Clientes</p>
      <h1 className="mt-2 font-serif text-4xl text-stone-900">Relacion comercial</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {adminCustomers.map((customer) => (
          <div className="rounded-[1.6rem] border border-stone-200 bg-white p-5" key={customer.id}>
            <h2 className="text-xl font-semibold text-stone-900">{customer.name}</h2>
            <p className="mt-2 text-sm text-stone-600">{customer.email}</p>
            <p className="mt-1 text-sm text-stone-600">{customer.phone}</p>
            <div className="mt-5 flex items-center justify-between text-sm">
              <span className="text-stone-500">{customer.purchases} compras</span>
              <span className="font-semibold text-stone-900">{formatCurrency(customer.totalSpent)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
