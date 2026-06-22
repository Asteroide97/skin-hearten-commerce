"""Create CRM base tables.

Revision ID: 20260622_02
Revises: 20260622_01
Create Date: 2026-06-22 10:05:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260622_02"
down_revision = "20260622_01"
branch_labels = None
depends_on = None


def _column_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "crm_contacts" not in existing_tables:
        op.create_table(
            "crm_contacts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("first_name", sa.String(length=120), nullable=False),
            sa.Column("last_name", sa.String(length=120), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("whatsapp", sa.String(length=40), nullable=True),
            sa.Column("source", sa.String(length=80), nullable=False),
            sa.Column("lifecycle_status", sa.String(length=40), nullable=False, server_default="lead"),
            sa.Column("skin_type", sa.String(length=80), nullable=True),
            sa.Column("main_goal", sa.String(length=80), nullable=True),
            sa.Column("age_range", sa.String(length=80), nullable=True),
            sa.Column("accepted_marketing", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_crm_contacts_email", "crm_contacts", ["email"], unique=False)
        op.create_index("ix_crm_contacts_whatsapp", "crm_contacts", ["whatsapp"], unique=False)
    else:
        existing_columns = _column_names(inspector, "crm_contacts")
        with op.batch_alter_table("crm_contacts") as batch_op:
            if "first_name" not in existing_columns:
                batch_op.add_column(sa.Column("first_name", sa.String(length=120), nullable=False, server_default="Contacto"))
            if "last_name" not in existing_columns:
                batch_op.add_column(sa.Column("last_name", sa.String(length=120), nullable=True))
            if "email" not in existing_columns:
                batch_op.add_column(sa.Column("email", sa.String(length=255), nullable=True))
            if "whatsapp" not in existing_columns:
                batch_op.add_column(sa.Column("whatsapp", sa.String(length=40), nullable=True))
            if "source" not in existing_columns:
                batch_op.add_column(sa.Column("source", sa.String(length=80), nullable=False, server_default="unknown"))
            if "lifecycle_status" not in existing_columns:
                batch_op.add_column(sa.Column("lifecycle_status", sa.String(length=40), nullable=False, server_default="lead"))
            if "skin_type" not in existing_columns:
                batch_op.add_column(sa.Column("skin_type", sa.String(length=80), nullable=True))
            if "main_goal" not in existing_columns:
                batch_op.add_column(sa.Column("main_goal", sa.String(length=80), nullable=True))
            if "age_range" not in existing_columns:
                batch_op.add_column(sa.Column("age_range", sa.String(length=80), nullable=True))
            if "accepted_marketing" not in existing_columns:
                batch_op.add_column(sa.Column("accepted_marketing", sa.Boolean(), nullable=False, server_default=sa.false()))
            if "first_seen_at" not in existing_columns:
                batch_op.add_column(sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
            if "last_seen_at" not in existing_columns:
                batch_op.add_column(sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
            if "created_at" not in existing_columns:
                batch_op.add_column(sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
            if "updated_at" not in existing_columns:
                batch_op.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))

    existing_tables = set(inspector.get_table_names())
    if "crm_events" not in existing_tables:
        op.create_table(
            "crm_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("contact_id", sa.Integer(), sa.ForeignKey("crm_contacts.id"), nullable=True),
            sa.Column("anonymous_id", sa.String(length=120), nullable=True),
            sa.Column("event_type", sa.String(length=80), nullable=False),
            sa.Column("payload_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            sa.Column("source", sa.String(length=80), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    if "crm_notes" not in existing_tables:
        op.create_table(
            "crm_notes",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("contact_id", sa.Integer(), sa.ForeignKey("crm_contacts.id"), nullable=False),
            sa.Column("note", sa.Text(), nullable=False),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    if "crm_tasks" not in existing_tables:
        op.create_table(
            "crm_tasks",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("contact_id", sa.Integer(), sa.ForeignKey("crm_contacts.id"), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("status", sa.String(length=40), nullable=False, server_default="pending"),
            sa.Column("task_type", sa.String(length=40), nullable=False, server_default="manual"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "crm_tasks" in existing_tables:
        op.drop_table("crm_tasks")
    if "crm_notes" in existing_tables:
        op.drop_table("crm_notes")
    if "crm_events" in existing_tables:
        op.drop_table("crm_events")
    if "crm_contacts" in existing_tables:
        indexes = {index["name"] for index in inspector.get_indexes("crm_contacts")}
        if "ix_crm_contacts_whatsapp" in indexes:
            op.drop_index("ix_crm_contacts_whatsapp", table_name="crm_contacts")
        if "ix_crm_contacts_email" in indexes:
            op.drop_index("ix_crm_contacts_email", table_name="crm_contacts")
        op.drop_table("crm_contacts")
