from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session



from app.core.database import get_session
from app.core.security import get_current_company
from app.models import Company
from app.services.post_review_service import (
    PostReviewCreate,
    get_approved_post_reviews,
    get_pending_post_reviews,
    get_all_post_reviews,
    create_post_review,
    approve_post_review,
    reject_post_review,
    get_pending_post_review_count,
)
from app.core.security import get_current_admin_user

router = APIRouter(prefix="/post-reviews", tags=["Avaliações de Posts"])


@router.get("/")
def list_approved_post_reviews(
    post_id: int = Query(description="ID do post"),
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    """Endpoint público: lista avaliações aprovadas de um post específico."""
    reviews = get_approved_post_reviews(session, post_id, company.id)
    return reviews


@router.post("/", status_code=status.HTTP_201_CREATED)
def submit_post_review(
    data: PostReviewCreate,
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    """Endpoint público: envia uma nova avaliação para um post (vai para aprovação)."""
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(
            status_code=400,
            detail="A nota deve ser entre 1 e 5.",
        )
    if not data.customer_name.strip():
        data.customer_name = "Anônimo"

    review = create_post_review(session, data, company.id)
    if not review:
        raise HTTPException(
            status_code=400,
            detail="Erro ao criar avaliação. Verifique os dados.",
        )
    return {"message": "Avaliação enviada para aprovação!", "id": review.id}


@router.get("/pending")
def list_pending_post_reviews(
    admin=Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Endpoint admin: lista avaliações de posts pendentes."""
    reviews = get_pending_post_reviews(session, admin.company_id)
    return reviews


@router.get("/all")
def list_all_post_reviews(
    admin=Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Endpoint admin: retorna TODAS as avaliações de posts."""
    reviews = get_all_post_reviews(session, admin.company_id)
    return reviews


@router.patch("/{review_id}/approve")
def approve_post_review_endpoint(
    review_id: int,
    admin=Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Endpoint admin: aprova uma avaliação de post."""
    review = approve_post_review(session, review_id, admin.company_id)
    if not review:
        raise HTTPException(
            status_code=404,
            detail="Avaliação não encontrada ou já processada.",
        )
    return {"message": "Avaliação aprovada!", "review": review}


@router.patch("/{review_id}/reject")
def reject_post_review_endpoint(
    review_id: int,
    admin=Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Endpoint admin: rejeita uma avaliação de post."""
    review = reject_post_review(session, review_id, admin.company_id)
    if not review:
        raise HTTPException(
            status_code=404,
            detail="Avaliação não encontrada ou já processada.",
        )
    return {"message": "Avaliação rejeitada!", "review": review}


@router.get("/pending/count")
def pending_post_reviews_count(
    admin=Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Endpoint admin: retorna quantidade de avaliações de posts pendentes."""
    count = get_pending_post_review_count(session, admin.company_id)
    return {"count": count}
