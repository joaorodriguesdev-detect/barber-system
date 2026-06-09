import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlmodel import Session, select

from app.models import Company, TenantStatus

MANUAL_PAYMENT_CODE = os.getenv("MANUAL_PAYMENT_CODE", "ionbarber-active-2026")
DEFAULT_TRIAL_DAYS = int(os.getenv("TENANT_TRIAL_DAYS", "7"))
DEFAULT_SUBSCRIPTION_DAYS = int(os.getenv("TENANT_SUBSCRIPTION_DAYS", "30"))
DEFAULT_TRIAL_URL = os.getenv("ASAAS_TRIAL_URL", "https://www.asaas.com/")
DEFAULT_SUBSCRIPTION_URL = os.getenv("ASAAS_SUBSCRIPTION_URL", "https://www.asaas.com/")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _set_active_window(company: Company, days: int = DEFAULT_SUBSCRIPTION_DAYS) -> None:
    now = utc_now()
    company.status = TenantStatus.ACTIVE
    company.is_active = True
    company.subscription_end = now + timedelta(days=days)
    company.trial_end = company.trial_end or company.subscription_end


def _set_trial_window(company: Company, days: int = DEFAULT_TRIAL_DAYS) -> None:
    now = utc_now()
    company.status = TenantStatus.TRIAL
    company.is_active = True
    company.trial_end = now + timedelta(days=days)
    company.subscription_end = company.subscription_end or company.trial_end


def _set_suspended(company: Company) -> None:
    company.status = TenantStatus.SUSPENDED
    company.is_active = False


def sync_company_billing_state(company: Company, session: Optional[Session] = None) -> Company:
    now = utc_now()

    if company.status is None:
        if company.subscription_id:
            _set_active_window(company)
        elif company.is_active:
            _set_trial_window(company)
        else:
            _set_suspended(company)

    if company.status == TenantStatus.TRIAL:
        trial_end = as_utc(company.trial_end)
        if trial_end is None:
            trial_end = now + timedelta(days=DEFAULT_TRIAL_DAYS)
            company.trial_end = trial_end
        if trial_end <= now:
            _set_suspended(company)

    elif company.status == TenantStatus.ACTIVE:
        subscription_end = as_utc(company.subscription_end)
        if subscription_end is None and company.subscription_id:
            subscription_end = now + timedelta(days=DEFAULT_SUBSCRIPTION_DAYS)
            company.subscription_end = subscription_end
        if subscription_end is None or subscription_end <= now:
            _set_suspended(company)

    if session is not None:
        session.add(company)
        session.commit()
        session.refresh(company)

    return company


def normalize_legacy_company(company: Company) -> Company:
    return sync_company_billing_state(company)


def activate_company_from_payment(
    company: Company,
    session: Session,
    *,
    customer_id: Optional[str] = None,
    subscription_id: Optional[str] = None,
    payment_days: int = DEFAULT_SUBSCRIPTION_DAYS,
) -> Company:
    if customer_id:
        company.asaas_customer_id = customer_id
    if subscription_id:
        company.subscription_id = subscription_id

    _set_active_window(company, payment_days)
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


def mark_company_suspended(company: Company, session: Session, reason: Optional[str] = None) -> Company:
    _set_suspended(company)
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


def mark_company_trial(company: Company, session: Session, trial_days: int = DEFAULT_TRIAL_DAYS) -> Company:
    _set_trial_window(company, trial_days)
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


def find_company_for_billing(
    session: Session,
    *,
    company_id: Optional[int] = None,
    asaas_customer_id: Optional[str] = None,
    subscription_id: Optional[str] = None,
    subdomain: Optional[str] = None,
) -> Optional[Company]:
    if company_id is not None:
        company = session.get(Company, company_id)
        if company:
            return company

    statement = select(Company)
    if subscription_id:
        company = session.exec(statement.where(Company.subscription_id == subscription_id)).first()
        if company:
            return company
    if asaas_customer_id:
        company = session.exec(statement.where(Company.asaas_customer_id == asaas_customer_id)).first()
        if company:
            return company
    if subdomain:
        company = session.exec(statement.where(Company.subdomain == subdomain)).first()
        if company:
            return company

    return None


def resolve_checkout_link(company: Optional[Company] = None, kind: str = "subscription") -> str:
    if kind == "trial":
        return DEFAULT_TRIAL_URL
    return DEFAULT_SUBSCRIPTION_URL


def serialize_company_billing(company: Company) -> Dict[str, Any]:
    return {
        "id": company.id,
        "name": company.name,
        "subdomain": company.subdomain,
        "status": company.status,
        "trial_end": company.trial_end,
        "subscription_end": company.subscription_end,
        "subscription_id": company.subscription_id,
        "asaas_customer_id": company.asaas_customer_id,
    }

