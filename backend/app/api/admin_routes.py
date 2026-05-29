# backend/app/api/admin_routes.py
from fastapi import APIRouter, Depends
from app.core.security import get_current_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])

# Aqui você adicionará as rotas administrativas específicas de empresa no futuro
# Exemplo: @router.get("/dashboard") ...