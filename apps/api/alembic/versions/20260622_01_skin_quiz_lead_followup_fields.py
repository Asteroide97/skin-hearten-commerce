"""Add follow-up fields to skin quiz leads.

Revision ID: 20260622_01
Revises:
Create Date: 2026-06-22 08:35:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260622_01"
down_revision = "20260621_00"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "skin_quiz_leads" not in inspector.get_table_names():
        op.create_table(
            "skin_quiz_leads",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("whatsapp", sa.String(length=40), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("accepted_marketing", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="new"),
            sa.Column("internal_notes", sa.Text(), nullable=True),
            sa.Column("last_contacted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("answers_json", sa.JSON(), nullable=False),
            sa.Column("result_json", sa.JSON(), nullable=False),
            sa.Column("source", sa.String(length=50), nullable=False),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        return

    existing_columns = {column["name"] for column in inspector.get_columns("skin_quiz_leads")}
    with op.batch_alter_table("skin_quiz_leads") as batch_op:
        if "status" not in existing_columns:
            batch_op.add_column(
                sa.Column("status", sa.String(length=30), nullable=False, server_default="new"),
            )
        if "internal_notes" not in existing_columns:
            batch_op.add_column(sa.Column("internal_notes", sa.Text(), nullable=True))
        if "last_contacted_at" not in existing_columns:
            batch_op.add_column(sa.Column("last_contacted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "skin_quiz_leads" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("skin_quiz_leads")}
    with op.batch_alter_table("skin_quiz_leads") as batch_op:
        if "last_contacted_at" in existing_columns:
            batch_op.drop_column("last_contacted_at")
        if "internal_notes" in existing_columns:
            batch_op.drop_column("internal_notes")
        if "status" in existing_columns:
            batch_op.drop_column("status")
