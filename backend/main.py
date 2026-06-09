# backend/main.py
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, text

# Importações atualizadas para a nova estrutura de pastas
from app.core.database import create_db_and_tables, engine
from app.core import models  # Certifique-se que o arquivo models existe em app/models/

# Importa os routers a partir de app.api
from app.api import (
    auth, feed_routes, users, appointments, 
    admin_routes, services_routes, review_routes, post_review_routes, bot_routes, system_routes, billing_routes
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Executado quando o servidor inicia
    print("Iniciando o servidor e criando tabelas...")
    create_db_and_tables()
    
    # 👇 MÁGICA DA MIGRAÇÃO AUTOMÁTICA 👇
    # Força o Banco de Dados a criar a coluna 'logo_url' sem apagar nada!
    with Session(engine) as session:
        try:
            session.exec(text("ALTER TABLE companies ADD COLUMN logo_url VARCHAR;"))
            session.commit()
            print("✅ Coluna 'logo_url' adicionada com sucesso na tabela companies!")
        except Exception:
            # Se cair aqui, é porque a coluna já existe. Ele ignora em silêncio e segue o jogo.
            session.rollback()

        try:
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR;"))
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_id VARCHAR;"))
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'trial';"))
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP;"))
            session.exec(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP;"))
            session.exec(
                text(
                    """
                    UPDATE companies
                    SET status = COALESCE(status, CASE WHEN is_active THEN 'trial' ELSE 'suspended' END),
                        trial_end = COALESCE(trial_end, data_cadastro + interval '30 days'),
                        subscription_end = COALESCE(subscription_end, data_cadastro + interval '30 days')
                    WHERE status IS NULL;
                    """
                )
            )
            session.commit()
            print("✅ Colunas de cobrança da tabela companies verificadas com sucesso!")
        except Exception:
            session.rollback()
    # 👆 FIM DA MÁGICA 👆

    yield
    # Executado quando o servidor desliga
    print("Desligando o servidor...")

app = FastAPI(title="IonBarber API", lifespan=lifespan)

# Configuração do CORS — multi-tenant com lvh.me
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://([a-zA-Z0-9-]+\.)?lvh\.me(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cria diretório de uploads se não existir
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Monta a pasta de uploads para servir arquivos estaticamente
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Inclui os routers da aplicação
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(appointments.router)
app.include_router(feed_routes.router)
app.include_router(admin_routes.router)
app.include_router(services_routes.router)
app.include_router(review_routes.router)
app.include_router(post_review_routes.router)
app.include_router(bot_routes.router)
app.include_router(system_routes.router)
app.include_router(billing_routes.router)

@app.get("/")
async def root():
    return {"message": "IonBarber API rodando com PostgreSQL!"}