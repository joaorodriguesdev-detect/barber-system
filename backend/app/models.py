"""
Re-exporta todos os modelos e enums de app.core.models.
Este arquivo permite que os services e routes importem de 'app.models'
em vez de 'app.core.models', conforme as regras de clean code do projeto.
"""
from app.core.models import (
    # Enums
    UserRole,
    AppointmentStatus,
    ServiceType,
    PostReviewStatus,
    ReviewStatus,
    # Tabelas / Modelos
    Company,
    User,
    Post,
    PostReview,
    Service,
    WorkingHour,
    Appointment,
    Review,
    # Schemas de validação
    PostCreate,
    UserCreate,
    CompanyCreate,
)

__all__ = [
    "UserRole",
    "AppointmentStatus",
    "ServiceType",
    "PostReviewStatus",
    "ReviewStatus",
    "Company",
    "User",
    "Post",
    "PostReview",
    "Service",
    "WorkingHour",
    "Appointment",
    "Review",
    "PostCreate",
    "UserCreate",
    "CompanyCreate",
]
