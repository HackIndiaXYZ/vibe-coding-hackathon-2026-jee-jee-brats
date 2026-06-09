from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_session
from core.models import User

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(req: LoginRequest, session: AsyncSession = Depends(get_session)):
    query = select(User).where(User.email == req.email)
    result = await session.execute(query)
    user = result.unique().scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # In a real app we would use passlib/bcrypt to verify password hash here.
    # For this hackathon demo, we bypass hash checking since we seeded fake hashes.
    # The user just needs to enter ANY password with a valid email.
    
    return {
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
        },
        "token": f"mock-jwt-token-for-{user.id}"
    }
