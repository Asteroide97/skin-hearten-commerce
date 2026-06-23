"""Add product image media metadata.

Revision ID: 20260623_01
Revises: 20260622_08
Create Date: 2026-06-23 09:10:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260623_01"
down_revision = "20260622_08"
branch_labels = None
depends_on = None


def _column_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "product_images" not in existing_tables:
        return

    existing_columns = _column_names(inspector, "product_images")
    with op.batch_alter_table("product_images") as batch_op:
        if "alt_text" not in existing_columns:
            batch_op.add_column(sa.Column("alt_text", sa.String(length=255), nullable=True))
        if "storage_path" not in existing_columns:
            batch_op.add_column(sa.Column("storage_path", sa.String(length=512), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "product_images" not in existing_tables:
        return

    existing_columns = _column_names(inspector, "product_images")
    with op.batch_alter_table("product_images") as batch_op:
        if "storage_path" in existing_columns:
            batch_op.drop_column("storage_path")
        if "alt_text" in existing_columns:
            batch_op.drop_column("alt_text")
