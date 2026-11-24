from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

# SQLite necesita este flag porque uvicorn atiende cada request en otro hilo.
# Con PostgreSQL no hace falta.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)


def create_all_tables() -> None:
    """Crea las tablas que todavia no existen. Se llama al arrancar la app."""
    # el import registra los modelos en SQLModel.metadata antes del create_all
    import app.db.models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def session_factory() -> Session:
    """Una sesion nueva. El Unit of Work la abre y la cierra."""
    return Session(engine)
