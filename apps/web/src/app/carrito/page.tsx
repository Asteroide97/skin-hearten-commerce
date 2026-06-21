import { SectionHeading } from "@/components/shared/section-heading";
import { CartPage } from "@/components/cart/cart-page";

export default function ShoppingCartPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Carrito"
        title="Resumen limpio antes del checkout"
        description="Subtotal, descuento, envio y total listos para conectarse con la API real."
      />
      <CartPage />
    </div>
  );
}

