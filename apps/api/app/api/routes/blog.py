from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_admin
from app.schemas.blog import BlogPostRead, BlogPostWrite
from app.schemas.common import MessageResponse
from app.services.mock_store import BLOG_POSTS, create_entity, delete_entity, get_blog_post_by_slug, get_blog_posts, update_entity

router = APIRouter()


@router.get("/blog-posts", response_model=list[BlogPostRead])
def list_blog_posts() -> list[BlogPostRead]:
    return [BlogPostRead.model_validate(post) for post in get_blog_posts()]


@router.get("/blog-posts/{slug}", response_model=BlogPostRead)
def get_blog_post(slug: str) -> BlogPostRead:
    post = get_blog_post_by_slug(slug)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return BlogPostRead.model_validate(post)


@router.post("/admin/blog-posts", response_model=BlogPostRead)
def create_blog_post(payload: BlogPostWrite, _: dict = Depends(get_current_admin)) -> BlogPostRead:
    post = create_entity(BLOG_POSTS, payload.model_dump())
    return BlogPostRead.model_validate(post)


@router.put("/admin/blog-posts/{post_id}", response_model=BlogPostRead)
def update_blog_post(post_id: int, payload: BlogPostWrite, _: dict = Depends(get_current_admin)) -> BlogPostRead:
    post = update_entity(BLOG_POSTS, post_id, payload.model_dump())
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return BlogPostRead.model_validate(post)


@router.delete("/admin/blog-posts/{post_id}", response_model=MessageResponse)
def delete_blog_post(post_id: int, _: dict = Depends(get_current_admin)) -> MessageResponse:
    deleted = delete_entity(BLOG_POSTS, post_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return MessageResponse(message="Post deleted")

