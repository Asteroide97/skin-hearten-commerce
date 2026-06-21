import { products } from "@/lib/site-data";
import { formatCurrency } from "@/lib/format";

export default function AdminProductsPage() {
  return (
    <div className="soft-panel rounded-[1.8rem] p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Productos</p>
          <h1 className="mt-2 font-serif text-4xl text-stone-900">CRUD de catalogo</h1>
        </div>
        <button className="rounded-full bg-stone-950 px-5 py-3 text-sm text-white" type="button">
          Nuevo producto
        </button>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-stone-500">
            <tr>
              <th className="pb-4">Producto</th>
              <th className="pb-4">SKU</th>
              <th className="pb-4">Categoria</th>
              <th className="pb-4">Precio</th>
              <th className="pb-4">Stock</th>
              <th className="pb-4">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="py-4">
                  <p className="font-semibold text-stone-900">{product.name}</p>
                  <p className="text-stone-500">{product.brand}</p>
                </td>
                <td className="py-4 text-stone-600">{product.sku}</td>
                <td className="py-4 text-stone-600">{product.category}</td>
                <td className="py-4 text-stone-600">{formatCurrency(product.price)}</td>
                <td className="py-4 text-stone-600">{product.stock}</td>
                <td className="py-4 text-stone-600">{product.stock > 0 ? "Si" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

