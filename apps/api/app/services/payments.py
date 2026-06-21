from dataclasses import dataclass
from uuid import uuid4


@dataclass
class CheckoutIntent:
    provider: str
    checkout_url: str
    reference: str
    status: str = "pending"


def create_provider_checkout(provider: str, order_number: str, amount: float) -> CheckoutIntent:
    reference = f"{provider[:3]}_{uuid4().hex[:12]}"
    checkout_url = f"https://checkout.{provider}.example/{order_number}?amount={amount}"
    return CheckoutIntent(provider=provider, checkout_url=checkout_url, reference=reference)

