from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from app.core.database import get_session
from app.services.auth_service import authenticate_user
from app.core.security import create_access_token, get_password_hash
from app.models import Company, CompanyCreate, User, UserRole

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    """
    Rota de login que recebe username (email) e password
    no formato x-www-form-urlencoded (padrão OAuth2).
    Retorna um token JWT de acesso.
    """
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }


@router.post("/cadastro")
def register_company(data: CompanyCreate, session: Session = Depends(get_session)):
    """
    Registra uma nova empresa (multi-tenant) com seu admin.
    Retorna o subdomain da empresa criada.
    """
    # 1. Criar a empresa
    new_company = Company(name=data.company_name, subdomain=data.subdomain)
    session.add(new_company)
    session.commit()
    session.refresh(new_company)
    
    # 2. Criar o usuário admin vinculado à nova empresa
    new_user = User(
        company_id=new_company.id,
        name=data.admin_name,
        email=data.admin_email,
        hashed_password=get_password_hash(data.admin_password),
        role=UserRole.ADMIN
    )
    session.add(new_user)
    session.commit()
    
    return {"message": "Cadastro realizado com sucesso!", "subdomain": new_company.subdomain}
