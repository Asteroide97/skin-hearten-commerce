from __future__ import annotations

from sqlalchemy import inspect

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import Base, Role, User
from app.models.enums import RoleName


def main() -> None:
    with SessionLocal() as db:
        required_tables = {"roles", "users"}
        inspector = inspect(db.bind)
        existing_tables = set(inspector.get_table_names())
        if not required_tables.issubset(existing_tables):
            Base.metadata.create_all(
                bind=db.bind,
                tables=[
                    Role.__table__,
                    User.__table__,
                ],
            )

        role = db.query(Role).filter(Role.name == RoleName.SUPERADMIN.value).first()
        if not role:
            role = Role(
                name=RoleName.SUPERADMIN.value,
                description="SuperAdmin role for Skin Hearten",
            )
            db.add(role)
            db.flush()

        admin_user = db.query(User).filter(User.email == settings.admin_email.strip().lower()).first()
        if not admin_user:
            admin_user = User(
                email=settings.admin_email.strip().lower(),
                first_name="Skin",
                last_name="Hearten Admin",
                hashed_password=get_password_hash(settings.admin_password),
                is_active=True,
                role_id=role.id,
            )
            db.add(admin_user)
            db.commit()
            print(f"Admin user created: {admin_user.email}")
            return

        if admin_user.role_id != role.id:
            admin_user.role_id = role.id
            db.add(admin_user)
            db.commit()
            print(f"Admin user already existed and role was normalized: {admin_user.email}")
            return

        print(f"Admin user already exists: {admin_user.email}")


if __name__ == "__main__":
    main()
