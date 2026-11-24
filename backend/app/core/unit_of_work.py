from __future__ import annotations

from types import TracebackType

from sqlmodel import Session

from app.core.database import session_factory


class UnitOfWork:
    """Delimita la transaccion. Abre la sesion en __enter__ y en __exit__ hace
    commit si todo salio bien o rollback si hubo excepcion. Es el unico lugar
    de la aplicacion donde se llama a commit()."""

    session: Session

    def __enter__(self) -> UnitOfWork:
        self.session = session_factory()
        self._crear_repositorios()
        return self

    def _crear_repositorios(self) -> None:
        """Lo completa cada Unit of Work concreto con sus repositorios."""

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        try:
            if exc_type is None:
                self.session.commit()
            else:
                # una regla de negocio que falla deja la transaccion entera sin
                # efecto: tampoco se persiste el descuento de stock ya aplicado
                self.session.rollback()
        finally:
            self.session.close()
