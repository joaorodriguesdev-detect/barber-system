from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.core.database import get_session
from app.models import TenantStatus
from app.services.billing_service import (
    MANUAL_PAYMENT_CODE,
    activate_company_from_payment,
    find_company_for_billing,
    mark_company_suspended,
    mark_company_trial,
    resolve_checkout_link,
    serialize_company_billing,
)

router = APIRouter(prefix="/billing", tags=["billing"])


class CheckoutLinkRequest(BaseModel):
    company_id: int | None = None
    subdomain: str | None = None
    kind: Literal["trial", "subscription"] = "subscription"


class ManualPaymentRequest(BaseModel):
    customer_id: str = Field(..., description="ID do cliente no Asaas")
    status: Literal["active"] = "active"
    code: str = Field(..., description="Código fixo de autorização")
    subscription_id: str | None = None


class CompanyActionRequest(BaseModel):
    code: str = Field(..., description="Código fixo do superadmin")
    days: int | None = Field(default=None, ge=1, le=90)


@router.post("/checkout-link")
def create_checkout_link(
    payload: CheckoutLinkRequest,
    session: Session = Depends(get_session),
):
    company = find_company_for_billing(
        session,
        company_id=payload.company_id,
        subdomain=payload.subdomain,
    )
    if not company:
        raise HTTPException(
            status_code=404,
            detail={
                "message": "Barbearia não encontrada.",
                "trial_url": resolve_checkout_link(company=None, kind="trial"),
                "subscription_url": resolve_checkout_link(company=None, kind="subscription"),
            },
        )

    checkout_url = resolve_checkout_link(company, payload.kind)
    if not checkout_url:
        raise HTTPException(
            status_code=404,
            detail={
                "trial_url": resolve_checkout_link(company, "trial"),
                "subscription_url": resolve_checkout_link(company, "subscription"),
            },
        )

    return {
        "company": serialize_company_billing(company),
        "kind": payload.kind,
        "checkout_url": checkout_url,
    }


@router.post("/manual/activate")
def manual_activate_company(
    payload: ManualPaymentRequest,
    session: Session = Depends(get_session),
):
    if payload.code != MANUAL_PAYMENT_CODE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Código manual inválido.")

    company = find_company_for_billing(session, asaas_customer_id=payload.customer_id)
    if not company:
        raise HTTPException(status_code=404, detail="Cliente não encontrado para ativação manual.")

    if payload.status != "active":
        raise HTTPException(status_code=400, detail="O status manual deve ser 'active'.")

    activated = activate_company_from_payment(
        company,
        session,
        customer_id=payload.customer_id,
        subscription_id=payload.subscription_id or company.subscription_id,
    )
    return {
        "message": "Empresa ativada manualmente com sucesso.",
        "company": serialize_company_billing(activated),
    }


@router.post("/companies/{company_id}/suspend")
def suspend_company_manually(
    company_id: int,
    payload: CompanyActionRequest,
    session: Session = Depends(get_session),
):
    if payload.code != MANUAL_PAYMENT_CODE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Código manual inválido.")

    company = find_company_for_billing(session, company_id=company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    suspended = mark_company_suspended(company, session)
    return {"message": "Empresa suspensa manualmente.", "company": serialize_company_billing(suspended)}


@router.post("/companies/{company_id}/trial")
def assign_trial_manually(
    company_id: int,
    payload: CompanyActionRequest,
    session: Session = Depends(get_session),
):
    if payload.code != MANUAL_PAYMENT_CODE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Código manual inválido.")

    company = find_company_for_billing(session, company_id=company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    trial_days = payload.days or 7
    if trial_days not in (7, 15, 30):
        raise HTTPException(status_code=400, detail="O tempo manual deve ser de 7, 15 ou 30 dias.")

    trial = mark_company_trial(company, session, trial_days=trial_days)
    return {
        "message": f"Trial manual de {trial_days} dias aplicado com sucesso.",
        "company": serialize_company_billing(trial),
    }


@router.post("/asaas/webhook")
def asaas_webhook(payload: dict[str, Any] = Body(...), session: Session = Depends(get_session)):
    event = str(payload.get("event") or payload.get("type") or payload.get("status") or "").upper()
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    payment = payload.get("payment") if isinstance(payload.get("payment"), dict) else data
    customer = payload.get("customer") if isinstance(payload.get("customer"), dict) else data
    subscription = payload.get("subscription") if isinstance(payload.get("subscription"), dict) else data

    customer_id = (
        payload.get("customer_id")
        or (customer or {}).get("id")
        or (payment or {}).get("customer")
        or (subscription or {}).get("customer")
    )
    subscription_id = (
        payload.get("subscription_id")
        or (subscription or {}).get("id")
        or (payment or {}).get("subscription")
    )

    company = find_company_for_billing(
        session,
        asaas_customer_id=str(customer_id) if customer_id else None,
        subscription_id=str(subscription_id) if subscription_id else None,
    )
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada para este webhook.")

    if customer_id:
        company.asaas_customer_id = str(customer_id)
    if subscription_id:
        company.subscription_id = str(subscription_id)

    success_events = {
        "PAYMENT_RECEIVED",
        "PAYMENT_CONFIRMED",
        "PAYMENT_CREATED",
        "PAYMENT_SUCCESS",
        "PAYMENT_DONE",
        "SUBSCRIPTION_CREATED",
        "SUBSCRIPTION_REACTIVATED",
        "SUBSCRIPTION_ACTIVE",
    }
    suspended_events = {
        "PAYMENT_OVERDUE",
        "PAYMENT_CANCELED",
        "PAYMENT_CANCELLED",
        "PAYMENT_DELETED",
        "SUBSCRIPTION_CANCELED",
        "SUBSCRIPTION_CANCELLED",
        "SUBSCRIPTION_EXPIRED",
        "SUBSCRIPTION_SUSPENDED",
    }

    if event in success_events or payload.get("paid") is True:
        updated = activate_company_from_payment(
            company,
            session,
            customer_id=str(customer_id) if customer_id else company.asaas_customer_id,
            subscription_id=str(subscription_id) if subscription_id else company.subscription_id,
        )
        return {"ok": True, "event": event, "company": serialize_company_billing(updated)}

    if event in suspended_events:
        suspended = mark_company_suspended(company, session)
        return {"ok": True, "event": event, "company": serialize_company_billing(suspended)}

    if company.status == TenantStatus.TRIAL:
        trial = mark_company_trial(company, session)
        return {"ok": True, "event": event, "company": serialize_company_billing(trial)}

    return {"ok": True, "event": event, "company": serialize_company_billing(company)}

