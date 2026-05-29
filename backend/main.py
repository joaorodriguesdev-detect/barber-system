# backend/main.py
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Importações atualizadas para a nova estrutura de pastas
from app.core.database import create_db_and_tables
from app.core import models  # Certifique-se que o arquivo models existe em app/models/

# Importa os routers a partir de app.api
from app.api import (
    auth, feed_routes, users, appointments, 
    admin_routes, services_routes, review_routes, post_review_routes
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Executado quando o servidor inicia
    print("Iniciando o servidor e criando tabelas...")
    create_db_and_tables()
    yield
    # Executado quando o servidor desliga
    print("Desligando o servidor...")

app = FastAPI(title="IonBarber API", lifespan=lifespan)

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
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

@app.get("/")
async def root():
    return {"message": "IonBarber API rodando com PostgreSQL!"}