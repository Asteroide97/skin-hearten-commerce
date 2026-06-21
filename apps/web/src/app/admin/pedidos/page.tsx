import { adminOrders } from "@/lib/site-data";
import { formatCurrency } from "@/lib/format";

export default function AdminOrdersPage() {
  return (
    <div className="soft-panel rounded-[1.8rem] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Pedidos</p>
      <h1 className="mt-2 font-serif text-4xl text-stone-900">Operacion de ordenes</h1>
      <div className="mt-8 space-y-4">
        {adminOrders.map((order) => (
          <div
            className="rounded-[1.6rem] border border-stone-200 bg-white p-5"
            key={order.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-stone-900">{order.id}</p>
                <p className="mt-1 text-sm text-stone-600">{order.customer}</p>
              </div>
              <div className="text-sm text-stone-600">
                <p>{order.status}</p>
                <p>{order.paymentMethod}</p>
              </div>
              <div className="text-sm font-semibold text-stone-900">{formatCurrency(order.total)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

