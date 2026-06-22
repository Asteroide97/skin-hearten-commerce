"""Create CRM multichannel reminder tables.

Revision ID: 20260622_04
Revises: 20260622_03
Create Date: 2026-06-22 12:35:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260622_04"
down_revision = "20260622_03"
branch_labels = None
depends_on = None


def _column_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "crm_message_templates" not in existing_tables:
        op.create_table(
            "crm_message_templates",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("channel", sa.String(length=20), nullable=False),
            sa.Column("reminder_type", sa.String(length=40), nullable=False),
            sa.Column("subject", sa.String(length=255), nullable=True),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_crm_message_templates_name", "crm_message_templates", ["name"], unique=True)
    else:
        existing_columns = _column_names(inspector, "crm_message_templates")
        with op.batch_alter_table("crm_message_templates") as batch_op:
            if "name" not in existing_columns:
                batch_op.add_column(sa.Column("name", sa.String(length=160), nullable=False, server_default="Template"))
            if "channel" not in existing_columns:
                batch_op.add_column(sa.Column("channel", sa.String(length=20), nullable=False, server_default="whatsapp"))
            if "reminder_type" not in existing_columns:
                batch_op.add_column(sa.Column("reminder_type", sa.String(length=40), nullable=False, server_default="manual"))
            if "subject" not in existing_columns:
                batch_op.add_column(sa.Column("subject", sa.String(length=255), nullable=True))
            if "body" not in existing_columns:
                batch_op.add_column(sa.Column("body", sa.Text(), nullable=False, server_default="Mensaje"))
            if "is_active" not in existing_columns:
                batch_op.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
            if "created_at" not in existing_columns:
                batch_op.add_column(sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
            if "updated_at" not in existing_columns:
                batch_op.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))

    existing_tables = set(inspector.get_table_names())
    if "crm_reminders" not in existing_tables:
        op.create_table(
            "crm_reminders",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("contact_id", sa.Integer(), sa.ForeignKey("crm_contacts.id"), nullable=False),
            sa.Column("channel", sa.String(length=20), nullable=False),
            sa.Column("reminder_type", sa.String(length=40), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
            sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
            sa.Column("template_id", sa.Integer(), nullable=True),
            sa.Column("rendered_subject", sa.String(length=255), nullable=True),
            sa.Column("rendered_body", sa.Text(), nullable=False),
            sa.Column("related_order_id", sa.Integer(), nullable=True),
            sa.Column("related_event_id", sa.Integer(), nullable=True),
            sa.Column("sent_manually_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("skipped_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "crm_reminders" in existing_tables:
        op.drop_table("crm_reminders")

    if "crm_message_templates" in existing_tables:
        indexes = {index["name"] for index in inspector.get_indexes("crm_message_templates")}
        if "ix_crm_message_templates_name" in indexes:
            op.drop_index("ix_crm_message_templates_name", table_name="crm_message_templates")
        op.drop_table("crm_message_templates")
