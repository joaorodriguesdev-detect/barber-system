# backend/app/api/feed_routes.py
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlmodel import Session
from app.core.database import get_session
from app.core.security import get_current_company
from app.models import Company
from app.services import feed_service

router = APIRouter(prefix="/feed", tags=["Feed Social"])

@router.get("/")
def read_feed(
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    """
    Endpoint publico para listar o feed de fotos da barbearia.
    Filtrado por empresa (multi-tenant).
    """
    posts = feed_service.get_active_feed(session, company.id)
    return posts

@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    deleted = feed_service.delete_post(session, company.id, post_id)
    if not deleted:
        raise HTTPException(404, "Post nao encontrado.")
    return {"ok": True, "message": "Post deletado com sucesso"}

@router.post("/")
async def create_post(
    barber_id: int = Form(...),
    image: UploadFile = File(...),
    caption: str = Form(default=None),
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "O arquivo deve ser uma imagem.")

    ext = image.filename.split(".")[-1] if image.filename else "jpg"
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = f"uploads/{unique_name}"

    content = await image.read()
    with open(file_path, "wb") as f:
        f.write(content)

    image_url = f"http://192.168.1.1:8000/uploads/{unique_name}"

    new_post = feed_service.create_new_post(session, company.id, barber_id, image_url, caption)
    return new_post
