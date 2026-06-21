import { adminOrders, dashboardMetrics } from "@/lib/site-data";
import { formatCurrency } from "@/lib/format";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="soft-panel rounded-[1.8rem] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Dashboard</p>
        <h1 className="mt-3 font-serif text-4xl text-stone-900">Operacion Skin Hearten</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardMetrics.map((metric) => (
          <div className="soft-panel rounded-[1.8rem] p-6" key={metric.label}>
            <p className="text-sm text-stone-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-stone-900">{metric.value}</p>
            <p className="mt-2 text-sm text-stone-600">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="soft-panel rounded-[1.8rem] p-6">
          <h2 className="font-serif text-3xl text-stone-900">Ventas diarias</h2>
          <div className="mt-8 flex h-64 items-end gap-4">
            {[42, 58, 47, 73, 61, 82, 68].map((height, index) => (
              <div className="flex-1" key={height + index}>
                <div
                  className="rounded-t-[1.2rem] bg-gradient-to-t from-stone-950 to-stone-500"
                  style={{ height: `${height * 2}px` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="soft-panel rounded-[1.8rem] p-6">
          <h2 className="font-serif text-3xl text-stone-900">Ordenes recientes</h2>
          <div className="mt-6 space-y-4">
            {adminOrders.map((order) => (
              <div className="rounded-[1.4rem] bg-white p-4" key={order.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-stone-900">{order.id}</p>
                  <p className="text-sm text-stone-500">{order.status}</p>
                </div>
                <p className="mt-2 text-sm text-stone-600">{order.customer}</p>
                <p className="mt-2 text-sm text-stone-600">
                  {order.paymentMethod} · {formatCurrency(order.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

