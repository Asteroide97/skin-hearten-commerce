from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=120)
    last_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    phone: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    scope: str


class MeResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    scope: str

