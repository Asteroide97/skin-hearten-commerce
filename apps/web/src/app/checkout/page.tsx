import { SectionHeading } from "@/components/shared/section-heading";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Checkout"
        title="Compra segura con pedido persistido"
        description="Formulario conectado al backend para validar, crear orden y confirmar el flujo actual."
      />
      <CheckoutForm />
    </div>
  );
}
