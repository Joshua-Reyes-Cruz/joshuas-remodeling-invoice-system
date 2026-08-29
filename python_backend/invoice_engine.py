"""Canonical money calculations for Joshua's Remodeling documents.

All arithmetic uses Decimal and rounds only at currency boundaries. This module
is intentionally independent of Flask so it can also be used by background
jobs, PDF generation, and signature webhooks.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Iterable

CENT = Decimal("0.01")


def decimal(value: Any) -> Decimal:
    return Decimal(str(value or 0))


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class LineItem:
    quantity: Decimal
    unit_price: Decimal
    taxable: bool = True

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "LineItem":
        return cls(
            quantity=decimal(value.get("quantity")),
            unit_price=decimal(value.get("unitPrice", value.get("unit_price"))),
            taxable=bool(value.get("taxable", True)),
        )

    @property
    def amount(self) -> Decimal:
        return money(self.quantity * self.unit_price)


@dataclass(frozen=True)
class InvoiceTotals:
    subtotal: Decimal
    discount: Decimal
    taxable_amount: Decimal
    tax: Decimal
    tip: Decimal
    total: Decimal

    def to_json(self) -> dict[str, str]:
        return {key: f"{value:.2f}" for key, value in asdict(self).items()}


def calculate_totals(
    items: Iterable[LineItem],
    *,
    discount: Decimal = Decimal("0"),
    tax_rate: Decimal = Decimal("0"),
    tip: Decimal = Decimal("0"),
) -> InvoiceTotals:
    item_list = list(items)
    subtotal = money(sum((item.amount for item in item_list), Decimal("0")))
    taxable_subtotal = money(
        sum((item.amount for item in item_list if item.taxable), Decimal("0"))
    )
    applied_discount = money(min(max(discount, Decimal("0")), subtotal))

    # MVP rule: a document-level discount reduces the taxable portion first.
    # This exactly reproduces the supplied $401 sample invoice.
    taxable_amount = money(max(Decimal("0"), taxable_subtotal - applied_discount))
    tax = money(taxable_amount * max(tax_rate, Decimal("0")) / Decimal("100"))
    safe_tip = money(max(tip, Decimal("0")))
    total = money(subtotal - applied_discount + tax + safe_tip)
    return InvoiceTotals(subtotal, applied_discount, taxable_amount, tax, safe_tip, total)


def calculate_payload(payload: dict[str, Any]) -> dict[str, str]:
    items = [LineItem.from_dict(item) for item in payload.get("lineItems", [])]
    return calculate_totals(
        items,
        discount=decimal(payload.get("discount")),
        tax_rate=decimal(payload.get("taxRate", payload.get("tax_rate"))),
        tip=decimal(payload.get("tip")),
    ).to_json()
