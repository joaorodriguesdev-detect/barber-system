# backend/seed.py
"""
Script para popular o banco com dados iniciais.
Execute com: python seed.py
"""

from app.core.database import engine, create_db_and_tables
from app.core.models import User, UserRole, Service, ServiceType
from app.core.security import get_password_hash
from sqlmodel import Session, select


def seed_admin(session: Session):
    """Cria o usuário admin se não existir."""
    statement = select(User).where(User.email == "admin")
    existing = session.exec(statement).first()

    if existing:
        print("Admin ja existe no banco.")
        return existing

    admin = User(
        name="Administrador",
        email="admin",
        hashed_password=get_password_hash("Nezy@sistem2026"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    print(f"Admin criado com sucesso! (ID: {admin.id})")
    return admin

def seed_working_hours(session: Session):
    """Cria horários de trabalho para o admin (seg-sex das 08:00-18:00, sáb 08:00-13:00)."""
    from app.core.models import WorkingHour
    from datetime import time

    barber_id = 1
    existing = session.exec(
        select(WorkingHour).where(WorkingHour.barber_id == barber_id)
    ).first()

    if existing:
        print("Horarios de trabalho ja existem.")
        return

    working_days = [
        {"day_of_week": 0, "start": time(8, 0), "end": time(18, 0)},  # Segunda
        {"day_of_week": 1, "start": time(8, 0), "end": time(18, 0)},  # Terça
        {"day_of_week": 2, "start": time(8, 0), "end": time(18, 0)},  # Quarta
        {"day_of_week": 3, "start": time(8, 0), "end": time(18, 0)},  # Quinta
        {"day_of_week": 4, "start": time(8, 0), "end": time(18, 0)},  # Sexta
        {"day_of_week": 5, "start": time(8, 0), "end": time(13, 0)},  # Sábado
    ]

    for day in working_days:
        wh = WorkingHour(
            barber_id=barber_id,
            day_of_week=day["day_of_week"],
            start_time=day["start"],
            end_time=day["end"],
            is_available=True,
        )
        session.add(wh)

    session.commit()
    print(f"Horarios de trabalho criados para o admin!")


def seed_services(session: Session):
    """Cria os serviços padrão da barbearia se não existirem."""
    services_data = [
        {"name": ServiceType.CABELO, "description": "Corte Social", "price": 25.00, "duration_minutes": 30},
        {"name": ServiceType.BARBA, "description": "Degradê", "price": 35.00, "duration_minutes": 40},
        {"name": ServiceType.LUZES, "description": "Degradê Navalhado", "price": 40.00, "duration_minutes": 45},
        {"name": ServiceType.HIDRATACAO, "description": "Cabelo e Barba", "price": 60.00, "duration_minutes": 60},
        {"name": ServiceType.SOBRANCELHA, "description": "Cabelo, Barba e Sobrancelha", "price": 70.00, "duration_minutes": 75},
        {"name": ServiceType.COMBO_CABELO_BARBA, "description": "Platinado", "price": 200.00, "duration_minutes": 120},
        {"name": ServiceType.COMBO_COMPLETO, "description": "Luzes", "price": 100.00, "duration_minutes": 90},
    ]

    created_count = 0
    for svc in services_data:
        existing = session.exec(
            select(Service).where(Service.name == svc["name"])
        ).first()
        if not existing:
            service = Service(**svc)
            session.add(service)
            created_count += 1

    if created_count > 0:
        session.commit()
        print(f"{created_count} servicos criados com sucesso!")
    else:
        print("Servicos ja existem no banco.")

    return created_count


def main():
    print("Criando tabelas (se necessario)...")
    create_db_and_tables()

    with Session(engine) as session:
        seed_admin(session)
        seed_services(session)
        seed_working_hours(session)  # <-- ADICIONE ESTA LINHA

    print("\nSeed concluido com sucesso!")


if __name__ == "__main__":
    main()

