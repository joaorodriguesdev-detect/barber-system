import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Header
from sqlmodel import Session
from app.core.database import get_session
from app.core.security import decode_access_token, get_current_company
from app.models import Company, User
from app.services import feed_service

router = APIRouter(prefix="/feed", tags=["Feed Social"])


@router.get("/")
def read_feed(
    company_id: int,
    session: Session = Depends(get_session),
):
    print(f"\n[FEED_ROUTES] GET /feed/?company_id={company_id}")
    posts = feed_service.get_active_feed(session, company_id)
    print(f"[FEED_ROUTES] Retornando {len(posts)} posts para company_id={company_id}")
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
    authorization: str = Header(...),
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    print("\n" + "=" * 70)
    print("[FEED_ROUTES] POST /feed/ — REQUISIÇÃO RECEBIDA")
    print("=" * 70)

    # ------------------------------------------------------------------
    # RASTREADOR #1: Token → company_id
    # ------------------------------------------------------------------
    print("\n[RASTREADOR #1] TOKEN vs COMPANY")
    print(f"  Header Authorization presente: {'Sim' if authorization else 'NÃO!'}")
    print(f"  company (vindo de get_current_company):")
    print(f"    → company.id   = {company.id}")
    print(f"    → company.name = {company.name}")
    print(f"    → company.subdomain = {company.subdomain}")

    # Decodifica manualmente para ver o que está no token
    token_raw = authorization.replace("Bearer ", "")
    try:
        payload = decode_access_token(token_raw)
        print(f"  Token decodificado:")
        print(f"    → sub       = {payload.get('sub')}")
        print(f"    → user_id   = {payload.get('user_id')}")
        print(f"    → role      = {payload.get('role')}")
        print(f"    → exp       = {datetime.fromtimestamp(payload.get('exp'), tz=timezone.utc)}")
    except Exception as e:
        print(f"  ⚠️  ERRO ao decodificar token manualmente: {e}")

        # ------------------------------------------------------------------
    # VALIDAÇÃO DE IMAGEM
    # ------------------------------------------------------------------
    if not image.content_type or not image.content_type.startswith("image/"):
        print(f"  ❌ VALIDAÇÃO FALHOU: content_type não é imagem: {image.content_type}")
        raise HTTPException(400, "O arquivo deve ser uma imagem.")

    # ------------------------------------------------------------------
    # RASTREADOR #2: Dados do FormData
    # ------------------------------------------------------------------
    print(f"\n[RASTREADOR #2] DADOS DO FORM")
    print(f"  barber_id (FormData) = {barber_id}")
    print(f"  caption   (FormData) = {repr(caption)}")
    print(f"  filename  (imagem)   = {image.filename}")
    print(f"  content_type         = {image.content_type}")

    # ------------------------------------------------------------------
    # RASTREADOR #3: Escrita do arquivo no disco
    # ------------------------------------------------------------------
    print("\n[RASTREADOR #3] GRAVAÇÃO DO ARQUIVO")

    ext = image.filename.split(".")[-1] if image.filename else "jpg"
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = f"uploads/{unique_name}"
    abs_path = os.path.abspath(file_path)

    print(f"  unique_name = {unique_name}")
    print(f"  file_path   = {file_path}")
    print(f"  abs_path    = {abs_path}")
    print(f"  Diretório uploads existe? {os.path.isdir('uploads')}")

    # Lê o conteúdo UMA ÚNICA VEZ
    content = await image.read()
    print(f"  bytes lidos do upload = {len(content)}")

    with open(file_path, "wb") as f:
        f.write(content)

    print(f"  Arquivo salvo. Checando se existe...")
    if os.path.exists(file_path):
        file_size = os.path.getsize(file_path)
        print(f"  ✅ Arquivo existe no disco! Tamanho: {file_size} bytes (esperado: {len(content)})")
        if file_size != len(content):
            print(f"  ⚠️  TAMANHO DIFERENTE! Pode indicar corrupção.")
    else:
        print(f"  ❌ ARQUIVO NÃO ENCONTRADO no disco após salvar!")

    image_url = f"http://localhost:8000/uploads/{unique_name}"
    print(f"  image_url   = {image_url}")

    # ------------------------------------------------------------------
    # RASTREADOR #4: Envio para o service
    # ------------------------------------------------------------------
    print("\n[RASTREADOR #4] CHAMANDO feed_service.create_new_post()")
    print(f"  Argumentos: company_id={company.id} | barber_id={barber_id} | image_url={image_url} | caption={repr(caption)}")

    new_post = feed_service.create_new_post(session, company.id, barber_id, image_url, caption)

    print(f"\n[RASTREADOR #5] RETORNO DA FUNÇÃO")
    print(f"  new_post.id         = {new_post.id}")
    print(f"  new_post.company_id = {new_post.company_id}")
    print(f"  new_post.barber_id  = {new_post.barber_id}")
    print(f"  new_post.image_url  = {new_post.image_url}")
    print(f"  new_post.created_at = {new_post.created_at}")
    print("=" * 70 + "\n")

    return new_post