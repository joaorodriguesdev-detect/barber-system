# backend/app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from sqlmodel import Session, select
from app.models import UserRole
from passlib.context import CryptContext
from jose import JWTError, jwt

# Importações internas do seu projeto
from app.core.database import get_session
from app.models import Company, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "super-secret-key-mude-em-producao"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise ValueError("Token inválido ou expirado")

# --- Lógica de Segurança Multi-tenant ---

def get_current_user(
    authorization: str = Header(...),
    session: Session = Depends(get_session),
) -> User:
    """
    Dependency que extrai o token JWT do header Authorization,
    decodifica e retorna o usuário autenticado.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não fornecido ou formato inválido",
        )

    token = authorization.replace("Bearer ", "")

    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: user_id não encontrado",
        )

    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou inativo",
        )

    return user


def get_current_company(
    user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
) -> Company:
    # Busca a empresa do usuário logado
    company = session.get(Company, user.company_id)
    
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    
    # Lógica dos 7 dias de teste
    # Comparando UTC com UTC para evitar erros de timezone
    if datetime.now(timezone.utc) > company.data_cadastro.replace(tzinfo=timezone.utc) + timedelta(days=7):
        if not company.is_active: 
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Seu período de teste de 7 dias expirou."
            )
    return company

def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acesso negado: Apenas administradores podem acessar esta rota."
        )
    return current_user