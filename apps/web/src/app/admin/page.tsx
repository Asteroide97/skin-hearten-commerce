import { adminOrders, dashboardMetrics } from "@/lib/site-data";
import { formatCurrency } from "@/lib/format";

export default function AdminDashboardPage() {
  return (
    <div className="admin-workspace space-y-6">
      <section className="admin-panel px-6 py-6">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
          <div>
            <p className="section-label">Dashboard</p>
            <h1 className="mt-3 font-serif text-[3rem] leading-[0.94] text-stone-950">
              Operacion Skin Hearten
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              Una lectura compacta de ventas, ordenes y ritmo comercial para empezar el dia sin ruido visual.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {dashboardMetrics.slice(0, 3).map((metric) => (
              <div className="rounded-[1.2rem] border border-stone-200 bg-[#fcfaf7] px-4 py-4" key={metric.label}>
                <p className="text-xs tracking-[0.08em] text-stone-500">{metric.label}</p>
                <p className="mt-2 text-xl font-semibold text-stone-950">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardMetrics.map((metric) => (
          <div className="admin-panel px-5 py-5" key={metric.label}>
            <p className="text-sm text-stone-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-stone-950">{metric.value}</p>
            <p className="mt-2 text-sm leading-7 text-stone-600">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="admin-panel px-6 py-6">
          <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <p className="section-label">Ritmo de ventas</p>
              <h2 className="mt-2 font-serif text-[2.3rem] leading-[0.96] text-stone-950">Ventas diarias</h2>
            </div>
            <p className="text-sm text-stone-500">Ultimos 7 dias</p>
          </div>
          <div className="mt-8 flex h-56 items-end gap-4">
            {[42, 58, 47, 73, 61, 82, 68].map((height, index) => (
              <div className="flex-1" key={height + index}>
                <div
                  className="rounded-t-[1rem] bg-gradient-to-t from-stone-950 to-stone-500"
                  style={{ height: `${height * 2}px` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="admin-panel px-6 py-6">
          <div className="border-b border-stone-200 pb-4">
            <p className="section-label">Monitoreo</p>
            <h2 className="mt-2 font-serif text-[2.3rem] leading-[0.96] text-stone-950">Ordenes recientes</h2>
          </div>
          <div className="mt-6 space-y-3">
            {adminOrders.map((order) => (
              <div className="rounded-[1.2rem] border border-stone-200 bg-[#fcfaf7] p-4" key={order.id}>
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
