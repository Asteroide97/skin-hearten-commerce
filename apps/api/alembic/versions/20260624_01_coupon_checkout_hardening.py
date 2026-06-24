"""Harden coupon persistence and checkout idempotency.

Revision ID: 20260624_01
Revises: 20260623_02
Create Date: 2026-06-24 09:30:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260624_01"
down_revision = "20260623_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "orders" in existing_tables:
        existing_columns = {column["name"] for column in inspector.get_columns("orders")}
        existing_indexes = {index["name"] for index in inspector.get_indexes("orders")}
        with op.batch_alter_table("orders") as batch_op:
            if "coupon_code" not in existing_columns:
                batch_op.add_column(sa.Column("coupon_code", sa.String(length=80), nullable=True))
            if "coupon_discount_amount" not in existing_columns:
                batch_op.add_column(sa.Column("coupon_discount_amount", sa.Numeric(10, 2), nullable=True))
            if "checkout_idempotency_key" not in existing_columns:
                batch_op.add_column(sa.Column("checkout_idempotency_key", sa.String(length=255), nullable=True))

        if "coupon_discount_amount" in {column["name"] for column in sa.inspect(bind).get_columns("orders")}:
            op.execute(
                sa.text(
                    "UPDATE orders "
                    "SET coupon_discount_amount = discount_total "
                    "WHERE coupon_discount_amount IS NULL AND COALESCE(discount_total, 0) > 0"
                )
            )

        if "ix_orders_checkout_idempotency_key" not in existing_indexes:
            op.create_index(
                "ix_orders_checkout_idempotency_key",
                "orders",
                ["checkout_idempotency_key"],
                unique=True,
            )

    if "coupon_redemptions" in existing_tables:
        existing_columns = {column["name"] for column in inspector.get_columns("coupon_redemptions")}
        existing_indexes = {index["name"] for index in inspector.get_indexes("coupon_redemptions")}
        with op.batch_alter_table("coupon_redemptions") as batch_op:
            if "idempotency_key" not in existing_columns:
                batch_op.add_column(sa.Column("idempotency_key", sa.String(length=255), nullable=True))
        if "ix_coupon_redemptions_idempotency_key" not in existing_indexes:
            op.create_index(
                "ix_coupon_redemptions_idempotency_key",
                "coupon_redemptions",
                ["idempotency_key"],
                unique=True,
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "coupon_redemptions" in existing_tables:
        existing_columns = {column["name"] for column in inspector.get_columns("coupon_redemptions")}
        existing_indexes = {index["name"] for index in inspector.get_indexes("coupon_redemptions")}
        if "ix_coupon_redemptions_idempotency_key" in existing_indexes:
            op.drop_index("ix_coupon_redemptions_idempotency_key", table_name="coupon_redemptions")
        with op.batch_alter_table("coupon_redemptions") as batch_op:
            if "idempotency_key" in existing_columns:
                batch_op.drop_column("idempotency_key")

    if "orders" in existing_tables:
        existing_columns = {column["name"] for column in inspector.get_columns("orders")}
        existing_indexes = {index["name"] for index in inspector.get_indexes("orders")}
        if "ix_orders_checkout_idempotency_key" in existing_indexes:
            op.drop_index("ix_orders_checkout_idempotency_key", table_name="orders")
        with op.batch_alter_table("orders") as batch_op:
            if "checkout_idempotency_key" in existing_columns:
                batch_op.drop_column("checkout_idempotency_key")
            if "coupon_discount_amount" in existing_columns:
                batch_op.drop_column("coupon_discount_amount")
            if "coupon_code" in existing_columns:
                batch_op.drop_column("coupon_code")
