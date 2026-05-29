from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import get_current_company
from app.models import Service, Company

router = APIRouter(prefix="/services", tags=["services"])


@router.get("/")
def list_services(
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    """
    Retorna todos os servicos ativos da barbearia (filtrado por empresa).
    """
    statement = select(Service).where(
        Service.is_active == True,
        Service.company_id == company.id
    )
    services = session.exec(statement).all()
    return [
        {
            "id": s.id,
            "name": s.name.value if hasattr(s.name, 'value') else s.name,
            "description": s.description,
            "price": s.price,
            "duration_minutes": s.duration_minutes,
        }
        for s in services
    ]
