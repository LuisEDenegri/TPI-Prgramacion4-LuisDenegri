from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import create_all_tables
from app.modules.auth.router import router as auth_router
from app.modules.categorias.router import router as categorias_router
from app.modules.pedidos.router import router as pedidos_router
from app.modules.productos.router import router as productos_router
from app.modules.usuarios.router import router as usuarios_router

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_all_tables()
    yield


app = FastAPI(
    title="Food Store API",
    description="Trabajo Práctico Integrador · Programación 4",
    version="1.0.0",
    lifespan=lifespan,
)

# el navegador compara el Origin como texto: http://localhost:5173 y
# http://127.0.0.1:5173 son origenes distintos aunque apunten a la misma maquina,
# asi que se habilitan los dos y el frontend anda con cualquiera de las dos URLs
ORIGENES = list(
    dict.fromkeys(
        [
            settings.FRONTEND_ORIGIN,
            settings.FRONTEND_ORIGIN.replace("localhost", "127.0.0.1"),
            settings.FRONTEND_ORIGIN.replace("127.0.0.1", "localhost"),
        ]
    )
)

# allow_credentials con una lista explicita de origenes: con "*" el navegador
# rechaza las cookies, y la sesion viaja justamente en una cookie
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (auth_router, usuarios_router, categorias_router, productos_router, pedidos_router):
    app.include_router(router, prefix=API_PREFIX)


@app.get("/", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "docs": "/docs"}
