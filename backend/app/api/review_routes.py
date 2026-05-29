# backend/app/api/review_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session



from app.core.database import get_session
from app.core.security import get_current_company
from app.models import Company
from app.services.review_service import (
    ReviewCreate,
    get_approved_reviews,
    create_review,
    get_pending_reviews,
    approve_review,
    reject_review,
    get_all_reviews,
    get_pending_count,
)
from app.core.security import get_current_admin_user

router = APIRouter(prefix="/reviews", tags=["Avaliacoes"])


@router.get("/")
def list_approved_reviews(
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    """Endpoint publico: lista avaliacoes aprovadas (filtrado por empresa)."""
    reviews = get_approved_reviews(session, company.id)
    return reviews


@router.post("/", status_code=status.HTTP_201_CREATED)
def submit_review(
    data: ReviewCreate,
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    """Endpoint publico: envia uma nova avaliacao (vai para aprovacao)."""
    if len(data.comment) > 50:
        raise HTTPException(
            status_code=400,
            detail="O comentario deve ter no maximo 50 caracteres.",
        )
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(
            status_code=400,
            detail="A nota deve ser entre 1 e 5.",
        )
    review = create_review(session, data, company.id)
    return {"message": "Avaliacao enviada para aprovacao!", "id": review.id}


@router.get("/pending")
def list_pending_reviews(
    admin=Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Endpoint admin: lista avaliacoes pendentes."""
    reviews = get_pending_reviews(session, admin.company_id)
    return reviews


@router.patch("/{review_id}/approve")
def approve_review_endpoint(
    review_id: int,
    admin=Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Endpoint admin: aprova uma avaliacao."""
    review = approve_review(session, review_id, admin.company_id)
    if not review:
        raise HTTPException(status_code=404, detail="Avaliacao nao encontrada ou ja processada.")
    return {"message": "Avaliacao aprovada!", "review": review}


@router.patch("/{review_id}/reject")
def reject_review_endpoint(
    review_id: int,
    admin=Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Endpoint admin: rejeita uma avaliacao."""
    review = reject_review(session, review_id, admin.company_id)
    if not review:
        raise HTTPException(status_code=404, detail="Avaliacao nao encontrada ou ja processada.")
    return {"message": "Avaliacao rejeitada!", "review": review}


@router.get("/all")
def list_all_reviews(
    admin=Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Endpoint admin: retorna TODAS as avaliacoes (filtrado por empresa)."""
    reviews = get_all_reviews(session, admin.company_id)
    return reviews


@router.get("/pending/count")
def pending_reviews_count(
    admin=Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Endpoint admin: retorna quantidade de avaliacoes pendentes."""
    count = get_pending_count(session, admin.company_id)
    return {"count": count}
