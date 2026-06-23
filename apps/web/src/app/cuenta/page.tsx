import Link from "next/link";

import { CustomerOrdersLookup } from "@/components/account/customer-orders-lookup";
import { SectionHeading } from "@/components/shared/section-heading";

const accountBlocks = [
  {
    title: "Datos personales",
    description: "Nombre, correo, telefono y preferencias basicas del cliente.",
  },
  {
    title: "Direcciones",
    description: "Base para multiples direcciones y direccion principal por defecto.",
  },
  {
    title: "Pedidos",
    description: "Historial con numero, fecha, estado y total.",
  },
  {
    title: "Favoritos",
    description: "Espacio preparado para wishlist en una siguiente iteracion.",
  },
];

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Cuenta"
        title="Tu cuenta Skin Hearten"
        description="Consulta pedidos reales con tu email o telefono y deja lista tu area cliente para futuras funciones de perfil, direcciones y favoritos."
      />
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-full bg-stone-950 px-5 py-3 text-sm text-white" href="/ingresar">
          Ingresar
        </Link>
        <Link className="rounded-full border border-stone-300 px-5 py-3 text-sm text-stone-700" href="/registro">
          Crear cuenta
        </Link>
      </div>
      <CustomerOrdersLookup />
      <div className="grid gap-6 md:grid-cols-2">
        {accountBlocks.map((block) => (
          <div className="soft-panel rounded-[1.8rem] p-6" key={block.title}>
            <h2 className="font-serif text-3xl text-stone-900">{block.title}</h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">{block.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
