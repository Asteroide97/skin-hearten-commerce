"""Create import_jobs table for Shopify imports.

Revision ID: 20260622_07
Revises: 20260622_06
Create Date: 2026-06-22 20:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260622_07"
down_revision = "20260622_06"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "import_jobs" in existing_tables:
        return

    op.create_table(
        "import_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(length=80), nullable=False),
        sa.Column("import_type", sa.String(length=80), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="processing"),
        sa.Column("total_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("processed_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("success_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_report_json", sa.JSON(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_import_jobs_source", "import_jobs", ["source"])
    op.create_index("ix_import_jobs_import_type", "import_jobs", ["import_type"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "import_jobs" not in existing_tables:
        return

    existing_indexes = {index["name"] for index in inspector.get_indexes("import_jobs")}
    if "ix_import_jobs_import_type" in existing_indexes:
        op.drop_index("ix_import_jobs_import_type", table_name="import_jobs")
    if "ix_import_jobs_source" in existing_indexes:
        op.drop_index("ix_import_jobs_source", table_name="import_jobs")
    op.drop_table("import_jobs")
