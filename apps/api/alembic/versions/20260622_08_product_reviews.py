"""Create product_reviews table.

Revision ID: 20260622_08
Revises: 20260622_07
Create Date: 2026-06-22 22:15:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260622_08"
down_revision = "20260622_07"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "product_reviews" in existing_tables:
        return

    op.create_table(
        "product_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("customer_name", sa.String(length=255), nullable=False),
        sa.Column("customer_email", sa.String(length=255), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="pending"),
        sa.Column("source", sa.String(length=40), nullable=False, server_default="customer"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_product_reviews_product_id", "product_reviews", ["product_id"])
    op.create_index("ix_product_reviews_status", "product_reviews", ["status"])
    op.create_index("ix_product_reviews_rating", "product_reviews", ["rating"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "product_reviews" not in existing_tables:
        return

    existing_indexes = {index["name"] for index in inspector.get_indexes("product_reviews")}
    if "ix_product_reviews_rating" in existing_indexes:
        op.drop_index("ix_product_reviews_rating", table_name="product_reviews")
    if "ix_product_reviews_status" in existing_indexes:
        op.drop_index("ix_product_reviews_status", table_name="product_reviews")
    if "ix_product_reviews_product_id" in existing_indexes:
        op.drop_index("ix_product_reviews_product_id", table_name="product_reviews")
    op.drop_table("product_reviews")
