from sqlalchemy import func
from sqlmodel import Session, col, select

from app.core.base_repository import BaseRepository
from app.modules.productos.models import Producto


class ProductoRepository(BaseRepository[Producto]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Producto)

    def _filtros(
        self,
        search: str | None,
        categoria_id: int | None,
        disponible: bool | None,
    ):
        condiciones = [col(Producto.activo) == True]  # noqa: E712
        if search:
            # ilike: busca sin distinguir mayusculas y en cualquier parte del nombre
            condiciones.append(col(Producto.nombre).ilike(f"%{search}%"))
        if categoria_id is not None:
            condiciones.append(col(Producto.categoria_id) == categoria_id)
        if disponible is not None:
            condiciones.append(col(Producto.disponible) == disponible)
        return condiciones

    def search(
        self,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        categoria_id: int | None = None,
        disponible: bool | None = None,
    ) -> tuple[int, list[Producto]]:
        """Devuelve (total sin paginar, pagina pedida). El total alimenta el paginador."""
        condiciones = self._filtros(search, categoria_id, disponible)

        total = self.session.exec(
            select(func.count()).select_from(Producto).where(*condiciones)
        ).one()

        items = self.session.exec(
            select(Producto).where(*condiciones).order_by(Producto.id).offset(skip).limit(limit)
        ).all()

        return int(total), list(items)
