import uuid
import shutil
from pathlib import Path
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Request
from sqlmodel import Session, select, func
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_admin_user
from app.models import Appointment, AppointmentStatus, Service, User, Review, UserRole, ReviewStatus, Company, TenantStatus
from app.services.billing_service import sync_company_billing_state

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/dashboard")
def get_dashboard_metrics(
    admin: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    company_id = admin.company_id
    today = date.today()

    if not end_date:
        end_date = today + timedelta(days=365)
    if not start_date:
        start_date = today - timedelta(days=30)

    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())

    total_appointments = session.exec(
        select(func.count(Appointment.id)).where(
            Appointment.company_id == company_id,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
    ).first() or 0

    completed_count = session.exec(
        select(func.count(Appointment.id)).where(
            Appointment.company_id == company_id,
            Appointment.status == AppointmentStatus.COMPLETED,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
    ).first() or 0

    canceled_count = session.exec(
        select(func.count(Appointment.id)).where(
            Appointment.company_id == company_id,
            Appointment.status == AppointmentStatus.CANCELED,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
    ).first() or 0

    pending_count = session.exec(
        select(func.count(Appointment.id)).where(
            Appointment.company_id == company_id,
            Appointment.status == AppointmentStatus.PENDING,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
    ).first() or 0

    revenue_result = session.exec(
        select(func.sum(Service.price))
        .join(Appointment, Appointment.service_id == Service.id)
        .where(
            Appointment.company_id == company_id,
            Appointment.status == AppointmentStatus.COMPLETED,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
    ).first()
    
    revenue = round(float(revenue_result or 0.0), 2)

    total_barbers = session.exec(
        select(func.count(User.id)).where(
            User.company_id == company_id,
            User.role.in_([UserRole.ADMIN, UserRole.BARBER])
        )
    ).first() or 1

    pending_reviews = session.exec(
        select(func.count(Review.id)).where(
            Review.company_id == company_id,
            Review.status == ReviewStatus.PENDING,
        )
    ).first() or 0

    top_services_rows = session.exec(
        select(
            Service.name,
            Service.price,
            func.count(Appointment.id).label("count"),
        )
        .join(Appointment, Appointment.service_id == Service.id)
        .where(
            Appointment.company_id == company_id,
            Appointment.appointment_date >= start_dt,
            Appointment.appointment_date <= end_dt,
        )
        .group_by(Service.id, Service.name, Service.price)
        .order_by(func.count(Appointment.id).desc())
        .limit(3)
    ).all()

    top_services = []
    for row in top_services_rows:
        name = row.name.value if hasattr(row.name, "value") else str(row.name)
        top_services.append(
            {
                "name": name,
                "price": float(row.price),
                "count": row.count,
            }
        )

    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "total_appointments": total_appointments,
        "completed_appointments": completed_count,
        "canceled_appointments": canceled_count,
        "pending_appointments": pending_count,
        "revenue": revenue,
        "total_barbers": total_barbers,
        "total_attendances": completed_count, 
        "top_services": top_services,
        "pending_reviews": pending_reviews,
    }

# ==========================================
# ROTAS DA EQUIPE (FUNCIONÁRIOS)
# ==========================================

class BarberCreate(BaseModel):
    name: str
    phone: str

class AssignBarberUpdate(BaseModel):
    barber_id: int

@router.post("/barbers")
def create_barber(
    data: BarberCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    unique_ghost_email = f"barber_{uuid.uuid4().hex[:8]}@empresa{admin.company_id}.sistema.com"
    
    new_barber = User(
        name=data.name,
        email=unique_ghost_email,
        phone=data.phone,
        role=UserRole.BARBER,
        company_id=admin.company_id,
        hashed_password="none" 
    )
    
    try:
        session.add(new_barber)
        session.commit()
        session.refresh(new_barber)
        return new_barber
    except Exception as e:
        session.rollback()
        raise HTTPException(400, f"Erro do Banco de Dados: {str(e)}")

@router.get("/barbers")
def list_barbers(
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    users = session.exec(
        select(User).where(
            User.company_id == admin.company_id,
            User.role.in_([UserRole.ADMIN, UserRole.BARBER])
        )
    ).all()
    return users

@router.patch("/appointments/{appointment_id}/assign")
def assign_barber_route(
    appointment_id: int,
    data: AssignBarberUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    appointment = session.get(Appointment, appointment_id)
    if not appointment or appointment.company_id != admin.company_id:
        raise HTTPException(404, "Agendamento não encontrado")
    
    appointment.barber_id = data.barber_id
    session.add(appointment)
    session.commit()
    session.refresh(appointment)
    return appointment

# ==========================================
# ROTA DE UPLOAD DE LOGO BLINDADA
# ==========================================

@router.post("/company/logo")
def upload_company_logo(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Faz upload da logo da empresa associada ao admin logado."""
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(400, "Apenas arquivos de imagem são permitidos.")

        ext = Path(file.filename).suffix if file.filename else ".png"
        unique_name = f"logo_company_{admin.company_id}_{uuid.uuid4().hex[:8]}{ext}"

        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        upload_path = upload_dir / unique_name
        
        with upload_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # URL fixa apontando para a porta 8000 para não quebrar a exibição!
        logo_url = f"http://localhost:8000/uploads/{unique_name}"

        company = session.get(Company, admin.company_id)
        if not company:
            raise HTTPException(404, "Empresa não encontrada.")

        company.logo_url = logo_url
        session.add(company)
        session.commit()
        session.refresh(company)

        return {
            "logo_url": logo_url,
            "message": "Logo atualizada com sucesso!",
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro gigante no upload: {e}")
        # Transforma o erro 500 num 400 bonitinho pra não dar erro de CORS
        raise HTTPException(status_code=400, detail=f"Erro interno: {str(e)}")
    finally:
        file.file.close()


# ==========================================
# ROTA DO PLANO / LICENÇA
# ==========================================

@router.get("/company")
def get_company_info(
    admin: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Retorna dados da empresa + status do plano para o painel admin."""
    company = session.get(Company, admin.company_id)
    if not company:
        raise HTTPException(404, "Empresa não encontrada.")

    company = sync_company_billing_state(company, session)

    now = datetime.now(timezone.utc)

    def _aware(dt):
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    dias_restantes = 0
    if company.status == TenantStatus.TRIAL:
        trial_end = _aware(company.trial_end)
        if trial_end:
            dias_restantes = max(0, (trial_end - now).days)
    elif company.status == TenantStatus.ACTIVE:
        sub_end = _aware(company.subscription_end)
        if sub_end:
            dias_restantes = max(0, (sub_end - now).days)

    return {
        "status": company.status.value if hasattr(company.status, 'value') else company.status,
        "trial_end": company.trial_end,
        "subscription_end": company.subscription_end,
        "dias_restantes": dias_restantes,
        "data_cadastro": company.data_cadastro,
    }