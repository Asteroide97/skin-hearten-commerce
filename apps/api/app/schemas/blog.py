from pydantic import BaseModel, Field


class BlogPostRead(BaseModel):
    id: int
    title: str
    slug: str
    author: str
    content: list[str]
    meta_title: str | None = None
    meta_description: str | None = None


class BlogPostWrite(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    slug: str = Field(min_length=3, max_length=255)
    author: str = Field(min_length=2, max_length=120)
    content: list[str]
    meta_title: str | None = None
    meta_description: str | None = None

