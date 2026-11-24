from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.core.base_repository import BaseRepository
from app.modules.pedidos.models import EstadoPedido, Pedido


class PedidoRepository(BaseRepository[Pedido]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Pedido)

    def list_by_usuario(
        self,
        usuario_id: int | None = None,
        skip: int = 0,
        limit: int = 20,
        estado: str | None = None,
    ) -> tuple[int, list[Pedido]]:
        """usuario_id None lista los pedidos de todos (vista del admin)."""
        condiciones = []
        if usuario_id is not None:
            condiciones.append(col(Pedido.usuario_id) == usuario_id)
        if estado is not None:
            condiciones.append(col(Pedido.estado) == estado)

        total = self.session.exec(
            select(func.count()).select_from(Pedido).where(*condiciones)
        ).one()

        items = self.session.exec(
            select(Pedido)
            .where(*condiciones)
            .order_by(col(Pedido.created_at).desc())
            .offset(skip)
            .limit(limit)
        ).all()

        return int(total), list(items)

    def count_by_estado(self, estado: EstadoPedido) -> int:
        total = self.session.exec(
            select(func.count()).select_from(Pedido).where(col(Pedido.estado) == estado.value)
        ).one()
        return int(total)

    def count_hoy(self) -> int:
        """Pedidos creados en las ultimas 24 horas."""
        desde = datetime.now(timezone.utc) - timedelta(days=1)
        total = self.session.exec(
            select(func.count()).select_from(Pedido).where(col(Pedido.created_at) >= desde)
        ).one()
        return int(total)

    def ingresos_entregados(self) -> float:
        """Suma de los totales de los pedidos ENTREGADO. Sin entregas, 0."""
        suma = self.session.exec(
            select(func.coalesce(func.sum(col(Pedido.total)), 0.0)).where(
                col(Pedido.estado) == EstadoPedido.ENTREGADO.value
            )
        ).one()
        return float(suma)
