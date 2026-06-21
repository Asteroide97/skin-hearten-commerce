from sqlalchemy import Text, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin


class BlogPost(TimestampMixin, Base):
    __tablename__ = "blog_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    cover_image_url: Mapped[str | None] = mapped_column(String(255))
    author: Mapped[str] = mapped_column(String(120))
    content: Mapped[str] = mapped_column(Text())
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(String(255))


class Setting(TimestampMixin, Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(120), unique=True)
    value: Mapped[str] = mapped_column(Text())

