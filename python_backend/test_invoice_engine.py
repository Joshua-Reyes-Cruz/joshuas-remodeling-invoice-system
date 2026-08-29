from decimal import Decimal
import unittest

from invoice_engine import LineItem, calculate_totals


class InvoiceEngineTests(unittest.TestCase):
    def test_supplied_invoice_totals_401(self):
        totals = calculate_totals(
            [
                LineItem(Decimal("1"), Decimal("390")),
                LineItem(Decimal("2"), Decimal("5")),
            ],
            discount=Decimal("20"),
            tax_rate=Decimal("5"),
            tip=Decimal("2"),
        )
        self.assertEqual(totals.subtotal, Decimal("400.00"))
        self.assertEqual(totals.tax, Decimal("19.00"))
        self.assertEqual(totals.total, Decimal("401.00"))
