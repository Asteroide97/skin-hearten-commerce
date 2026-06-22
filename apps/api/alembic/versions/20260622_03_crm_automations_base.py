"""Create CRM automation tables.

Revision ID: 20260622_03
Revises: 20260622_02
Create Date: 2026-06-22 11:35:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260622_03"
down_revision = "20260622_02"
branch_labels = None
depends_on = None


def _column_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "crm_automation_rules" not in existing_tables:
        op.create_table(
            "crm_automation_rules",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("trigger_type", sa.String(length=50), nullable=False),
            sa.Column("delay_hours", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("task_type", sa.String(length=40), nullable=False, server_default="follow_up"),
            sa.Column("task_title_template", sa.String(length=255), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_crm_automation_rules_name", "crm_automation_rules", ["name"], unique=True)
    else:
        existing_columns = _column_names(inspector, "crm_automation_rules")
        with op.batch_alter_table("crm_automation_rules") as batch_op:
            if "name" not in existing_columns:
                batch_op.add_column(sa.Column("name", sa.String(length=160), nullable=False, server_default="Automation"))
            if "trigger_type" not in existing_columns:
                batch_op.add_column(sa.Column("trigger_type", sa.String(length=50), nullable=False, server_default="skin_quiz_completed"))
            if "delay_hours" not in existing_columns:
                batch_op.add_column(sa.Column("delay_hours", sa.Integer(), nullable=False, server_default="0"))
            if "task_type" not in existing_columns:
                batch_op.add_column(sa.Column("task_type", sa.String(length=40), nullable=False, server_default="follow_up"))
            if "task_title_template" not in existing_columns:
                batch_op.add_column(sa.Column("task_title_template", sa.String(length=255), nullable=False, server_default="Seguimiento {{first_name}}"))
            if "is_active" not in existing_columns:
                batch_op.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
            if "created_at" not in existing_columns:
                batch_op.add_column(sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
            if "updated_at" not in existing_columns:
                batch_op.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))

    existing_tables = set(inspector.get_table_names())
    if "crm_automation_runs" not in existing_tables:
        op.create_table(
            "crm_automation_runs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("rule_id", sa.Integer(), sa.ForeignKey("crm_automation_rules.id"), nullable=False),
            sa.Column("contact_id", sa.Integer(), sa.ForeignKey("crm_contacts.id"), nullable=False),
            sa.Column("source_event_id", sa.Integer(), sa.ForeignKey("crm_events.id"), nullable=True),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="pending"),
            sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "crm_automation_runs" in existing_tables:
        op.drop_table("crm_automation_runs")

    if "crm_automation_rules" in existing_tables:
        indexes = {index["name"] for index in inspector.get_indexes("crm_automation_rules")}
        if "ix_crm_automation_rules_name" in indexes:
            op.drop_index("ix_crm_automation_rules_name", table_name="crm_automation_rules")
        op.drop_table("crm_automation_rules")
