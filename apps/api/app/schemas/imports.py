from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ImportJobErrorRead(BaseModel):
    row_number: int = Field(serialization_alias="rowNumber")
    message: str
    raw_row: dict[str, str] = Field(serialization_alias="rawRow")

    model_config = ConfigDict(populate_by_name=True)


class ImportJobSummaryRead(BaseModel):
    id: int
    source: str
    import_type: str = Field(serialization_alias="importType")
    filename: str
    status: str
    total_rows: int = Field(serialization_alias="totalRows")
    processed_rows: int = Field(serialization_alias="processedRows")
    success_rows: int = Field(serialization_alias="successRows")
    failed_rows: int = Field(serialization_alias="failedRows")
    created_by_user_id: int | None = Field(default=None, serialization_alias="createdByUserId")
    created_at: datetime = Field(serialization_alias="createdAt")
    completed_at: datetime | None = Field(default=None, serialization_alias="completedAt")

    model_config = ConfigDict(populate_by_name=True)


class ImportJobDetailRead(ImportJobSummaryRead):
    error_report_json: list[ImportJobErrorRead] = Field(
        default_factory=list,
        serialization_alias="errorReportJson",
    )
    notes: str | None = None

    model_config = ConfigDict(populate_by_name=True)
