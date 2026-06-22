"""Add provider payload fields to payments.

Revision ID: 20260622_05
Revises: 20260622_04
Create Date: 2026-06-22 16:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260622_05"
down_revision = "20260622_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "payments" not in existing_tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("payments")}
    if "raw_payload_json" not in existing_columns:
        op.add_column("payments", sa.Column("raw_payload_json", sa.JSON(), nullable=True))
    if "failed_at" not in existing_columns:
        op.add_column("payments", sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "payments" not in existing_tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("payments")}
    if "failed_at" in existing_columns:
        op.drop_column("payments", "failed_at")
    if "raw_payload_json" in existing_columns:
        op.drop_column("payments", "raw_payload_json")
