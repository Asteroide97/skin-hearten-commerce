"""Expand coupons into real promotion engine.

Revision ID: 20260623_02
Revises: 20260623_01
Create Date: 2026-06-23 10:30:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260623_02"
down_revision = "20260623_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "coupons" not in existing_tables:
        op.create_table(
            "coupons",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("code", sa.String(length=80), nullable=False, unique=True),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("discount_type", sa.String(length=20), nullable=False),
            sa.Column("discount_value", sa.Numeric(10, 2), nullable=False),
            sa.Column("min_subtotal", sa.Numeric(10, 2), nullable=True),
            sa.Column("max_discount", sa.Numeric(10, 2), nullable=True),
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("usage_limit", sa.Integer(), nullable=True),
            sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("per_customer_limit", sa.Integer(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
    else:
        existing_columns = {column["name"] for column in inspector.get_columns("coupons")}
        with op.batch_alter_table("coupons") as batch_op:
            if "coupon_type" in existing_columns and "discount_type" not in existing_columns:
                batch_op.alter_column("coupon_type", new_column_name="discount_type", existing_type=sa.String(length=20))
            if "value" in existing_columns and "discount_value" not in existing_columns:
                batch_op.alter_column("value", new_column_name="discount_value", existing_type=sa.Numeric(10, 2))
            if "minimum_amount" in existing_columns and "min_subtotal" not in existing_columns:
                batch_op.alter_column("minimum_amount", new_column_name="min_subtotal", existing_type=sa.Numeric(10, 2))
            if "max_uses" in existing_columns and "usage_limit" not in existing_columns:
                batch_op.alter_column("max_uses", new_column_name="usage_limit", existing_type=sa.Integer())
            if "name" not in existing_columns:
                batch_op.add_column(sa.Column("name", sa.String(length=120), nullable=True))
            if "description" not in existing_columns:
                batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
            if "max_discount" not in existing_columns:
                batch_op.add_column(sa.Column("max_discount", sa.Numeric(10, 2), nullable=True))
            if "usage_count" not in existing_columns:
                batch_op.add_column(sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"))
            if "per_customer_limit" not in existing_columns:
                batch_op.add_column(sa.Column("per_customer_limit", sa.Integer(), nullable=True))
            if "is_active" not in existing_columns:
                batch_op.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))

        refreshed_columns = {column["name"] for column in sa.inspect(bind).get_columns("coupons")}
        if "name" in refreshed_columns:
            op.execute(sa.text("UPDATE coupons SET name = code WHERE name IS NULL"))
        if "is_active" in refreshed_columns:
            op.execute(sa.text("UPDATE coupons SET is_active = 1 WHERE is_active IS NULL"))
        if "usage_count" in refreshed_columns:
            if "coupon_usages" in existing_tables:
                op.execute(
                    sa.text(
                        "UPDATE coupons SET usage_count = "
                        "COALESCE((SELECT COUNT(*) FROM coupon_usages WHERE coupon_usages.coupon_id = coupons.id), 0)"
                    )
                )
            else:
                op.execute(sa.text("UPDATE coupons SET usage_count = 0 WHERE usage_count IS NULL"))

        refreshed_columns = {column["name"] for column in sa.inspect(bind).get_columns("coupons")}
        with op.batch_alter_table("coupons") as batch_op:
            if "name" in refreshed_columns:
                batch_op.alter_column("name", existing_type=sa.String(length=120), nullable=False)
            if "is_active" in refreshed_columns:
                batch_op.alter_column("is_active", existing_type=sa.Boolean(), nullable=False)

    if "coupon_redemptions" not in existing_tables:
        op.create_table(
            "coupon_redemptions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("coupon_id", sa.Integer(), sa.ForeignKey("coupons.id"), nullable=False),
            sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=True),
            sa.Column("customer_email", sa.String(length=255), nullable=True),
            sa.Column("customer_phone", sa.String(length=30), nullable=True),
            sa.Column("discount_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "coupon_redemptions" in existing_tables:
        op.drop_table("coupon_redemptions")

    if "coupons" not in existing_tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("coupons")}
    with op.batch_alter_table("coupons") as batch_op:
        if "is_active" in existing_columns:
            batch_op.drop_column("is_active")
        if "per_customer_limit" in existing_columns:
            batch_op.drop_column("per_customer_limit")
        if "usage_count" in existing_columns:
            batch_op.drop_column("usage_count")
        if "max_discount" in existing_columns:
            batch_op.drop_column("max_discount")
        if "description" in existing_columns:
            batch_op.drop_column("description")
        if "name" in existing_columns:
            batch_op.drop_column("name")
        if "usage_limit" in existing_columns and "max_uses" not in existing_columns:
            batch_op.alter_column("usage_limit", new_column_name="max_uses", existing_type=sa.Integer())
        if "min_subtotal" in existing_columns and "minimum_amount" not in existing_columns:
            batch_op.alter_column("min_subtotal", new_column_name="minimum_amount", existing_type=sa.Numeric(10, 2))
        if "discount_value" in existing_columns and "value" not in existing_columns:
            batch_op.alter_column("discount_value", new_column_name="value", existing_type=sa.Numeric(10, 2))
        if "discount_type" in existing_columns and "coupon_type" not in existing_columns:
            batch_op.alter_column("discount_type", new_column_name="coupon_type", existing_type=sa.String(length=20))
