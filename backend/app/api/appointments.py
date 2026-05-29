# backend/app/api/appointments.py
from datetime import datetime, date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_company
from app.models import Appointment, AppointmentStatus, Company
from app.services.appointment_service import (
    create_appointment,
    get_appointments_by_customer,
    get_appointments_by_barber,
    get_occupied_slots,
    update_appointment_status,
)

router = APIRouter(prefix="/appointments", tags=["appointments"])


class AppointmentCreate(BaseModel):
    """Schema para criacao de agendamento."""
    customer_id: int
    barber_id: int
    service_id: int
    appointment_date: datetime
    notes: str | None = None


class AppointmentResponse(BaseModel):
    """Schema de resposta de um agendamento."""
    id: int
    customer_id: int
    barber_id: int
    service_id: int
    appointment_date: datetime
    status: AppointmentStatus
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment_route(
    appointment_data: AppointmentCreate,
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    """
    Cria um novo agendamento.
    Valida disponibilidade do barbeiro antes de criar.
    """
    try:
        appointment = create_appointment(
            session=session,
            company_id=company.id,
            customer_id=appointment_data.customer_id,
            barber_id=appointment_data.barber_id,
            service_id=appointment_data.service_id,
            appointment_date=appointment_data.appointment_date,
            notes=appointment_data.notes,
        )
        return appointment
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("", response_model=list[AppointmentResponse])
def list_appointments(
    customer_id: int | None = Query(None, description="Filtrar por cliente"),
    barber_id: int | None = Query(None, description="Filtrar por barbeiro"),
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    """
    Lista agendamentos.
    Pode filtrar por customer_id ou barber_id.
    """
    if customer_id:
        return get_appointments_by_customer(session, company.id, customer_id)
    if barber_id:
        return get_appointments_by_barber(session, company.id, barber_id)

    statement = session.query(Appointment).where(
        Appointment.company_id == company.id
    ).order_by(Appointment.appointment_date.desc())
    return statement.all()


@router.get("/occupied-slots", response_model=List[datetime])
def get_occupied_slots_route(
    barber_id: int = Query(..., description="ID do barbeiro"),
    date: date = Query(..., description="Data para verificar (YYYY-MM-DD)"),
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    occupied = get_occupied_slots(session, company.id, barber_id, date)
    return occupied

class StatusUpdate(BaseModel):
    """Schema para atualizar status do agendamento."""
    status: AppointmentStatus


@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status_route(
    appointment_id: int,
    status_update: StatusUpdate,
    session: Session = Depends(get_session),
    company: Company = Depends(get_current_company),
):
    try:
        appointment = update_appointment_status(
            session=session,
            company_id=company.id,
            appointment_id=appointment_id,
            new_status=status_update.status,
        )
        return appointment
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
