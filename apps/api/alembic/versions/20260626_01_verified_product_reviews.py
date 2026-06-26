"""Add verified purchase fields to product reviews.

Revision ID: 20260626_01
Revises: 20260624_01
Create Date: 2026-06-26 10:30:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260626_01"
down_revision = "20260624_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "product_reviews" not in existing_tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("product_reviews")}
    existing_indexes = {index["name"] for index in inspector.get_indexes("product_reviews")}

    with op.batch_alter_table("product_reviews") as batch_op:
        if "order_id" not in existing_columns:
            batch_op.add_column(sa.Column("order_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_product_reviews_order_id_orders",
                "orders",
                ["order_id"],
                ["id"],
            )
        if "verified_purchase" not in existing_columns:
            batch_op.add_column(
                sa.Column(
                    "verified_purchase",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                )
            )

    if "ix_product_reviews_order_id" not in existing_indexes:
        op.create_index("ix_product_reviews_order_id", "product_reviews", ["order_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "product_reviews" not in existing_tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("product_reviews")}
    existing_indexes = {index["name"] for index in inspector.get_indexes("product_reviews")}
    foreign_keys = {foreign_key["name"] for foreign_key in inspector.get_foreign_keys("product_reviews")}

    if "ix_product_reviews_order_id" in existing_indexes:
        op.drop_index("ix_product_reviews_order_id", table_name="product_reviews")

    with op.batch_alter_table("product_reviews") as batch_op:
        if "fk_product_reviews_order_id_orders" in foreign_keys and "order_id" in existing_columns:
            batch_op.drop_constraint("fk_product_reviews_order_id_orders", type_="foreignkey")
        if "verified_purchase" in existing_columns:
            batch_op.drop_column("verified_purchase")
        if "order_id" in existing_columns:
            batch_op.drop_column("order_id")
