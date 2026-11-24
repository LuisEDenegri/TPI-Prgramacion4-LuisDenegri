from collections.abc import Callable

from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import engine
from app.core.security import decode_access_token
from app.db.models import Usuario

CREDENCIALES_INVALIDAS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="No se pudo validar la sesión",
)


def get_current_user(access_token: str | None = Cookie(default=None)) -> Usuario:
    """Lee el JWT de la cookie HttpOnly, valida firma y expiracion y carga el usuario."""
    if not access_token:
        raise CREDENCIALES_INVALIDAS

    username = decode_access_token(access_token)
    if username is None:
        raise CREDENCIALES_INVALIDAS

    with Session(engine) as session:
        usuario = session.exec(select(Usuario).where(Usuario.username == username)).first()

    if usuario is None:
        raise CREDENCIALES_INVALIDAS
    return usuario


def get_current_active_user(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    """Rechaza al usuario dado de baja logica, aunque su token siga vigente."""
    if usuario.disabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cuenta de usuario desactivada",
        )
    return usuario


def require_role(roles: list[str]) -> Callable[[Usuario], Usuario]:
    """Dependencia que exige uno de los roles indicados: require_role(["admin"])."""

    def comprobar(usuario: Usuario = Depends(get_current_active_user)) -> Usuario:
        if usuario.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenés permisos para realizar esta acción",
            )
        return usuario

    return comprobar
