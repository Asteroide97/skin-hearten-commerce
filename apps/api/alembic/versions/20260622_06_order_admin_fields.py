"""Add admin management fields to orders.

Revision ID: 20260622_06
Revises: 20260622_05
Create Date: 2026-06-22 18:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260622_06"
down_revision = "20260622_05"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "orders" not in existing_tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("orders")}
    with op.batch_alter_table("orders") as batch_op:
        if "tracking_number" not in existing_columns:
            batch_op.add_column(sa.Column("tracking_number", sa.String(length=120), nullable=True))
        if "shipping_carrier" not in existing_columns:
            batch_op.add_column(sa.Column("shipping_carrier", sa.String(length=120), nullable=True))
        if "internal_notes" not in existing_columns:
            batch_op.add_column(sa.Column("internal_notes", sa.Text(), nullable=True))
        if "shipped_at" not in existing_columns:
            batch_op.add_column(sa.Column("shipped_at", sa.DateTime(timezone=True), nullable=True))
        if "delivered_at" not in existing_columns:
            batch_op.add_column(sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True))
        if "cancelled_at" not in existing_columns:
            batch_op.add_column(sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
        if "refunded_at" not in existing_columns:
            batch_op.add_column(sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "orders" not in existing_tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("orders")}
    with op.batch_alter_table("orders") as batch_op:
        if "refunded_at" in existing_columns:
            batch_op.drop_column("refunded_at")
        if "cancelled_at" in existing_columns:
            batch_op.drop_column("cancelled_at")
        if "delivered_at" in existing_columns:
            batch_op.drop_column("delivered_at")
        if "shipped_at" in existing_columns:
            batch_op.drop_column("shipped_at")
        if "internal_notes" in existing_columns:
            batch_op.drop_column("internal_notes")
        if "shipping_carrier" in existing_columns:
            batch_op.drop_column("shipping_carrier")
        if "tracking_number" in existing_columns:
            batch_op.drop_column("tracking_number")
