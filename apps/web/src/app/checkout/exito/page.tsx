import { CheckoutStatusPage } from "@/components/checkout/checkout-status-page";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;

  return <CheckoutStatusPage orderNumberFromQuery={params.order ?? null} variant="success" />;
}
