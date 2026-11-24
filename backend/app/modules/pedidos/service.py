from datetime import datetime, timezone

from app.modules.pedidos.models import DetallePedido, EstadoPedido, Pedido
from app.modules.pedidos.schemas import (
    CambioEstado,
    PedidoCreate,
    PedidoRead,
    PedidosPaginados,
    ResumenPedidos,
)
from app.modules.pedidos.unit_of_work import PedidoUnitOfWork


class PedidoNoEncontrado(Exception):
    """404."""


class PedidoAjeno(Exception):
    """El pedido es de otro usuario. 403."""


class ProductoNoEncontrado(Exception):
    """404."""


class ProductoNoDisponible(Exception):
    """400."""


class ProductoRepetido(Exception):
    """400."""


class StockInsuficiente(Exception):
    """400."""


class TransicionInvalida(Exception):
    """400."""


# RN-02: unico lugar donde vive la maquina de estados. Lo que no figura aca no
# se puede hacer; los estados terminales tienen la lista vacia.
TRANSICIONES: dict[EstadoPedido, set[EstadoPedido]] = {
    EstadoPedido.PENDIENTE: {EstadoPedido.EN_PREPARACION, EstadoPedido.CANCELADO},
    EstadoPedido.EN_PREPARACION: {EstadoPedido.ENTREGADO, EstadoPedido.CANCELADO},
    EstadoPedido.ENTREGADO: set(),
    EstadoPedido.CANCELADO: set(),
}


class PedidoService:
    def __init__(self, uow: PedidoUnitOfWork) -> None:
        self.uow = uow

    # ---------------------------------------------------------------- crear

    def crear(self, usuario_id: int, datos: PedidoCreate) -> PedidoRead:
        """RN-01. Todo pasa dentro de una transaccion: si una sola linea falla,
        el __exit__ del Unit of Work hace rollback y no queda ni el pedido ni
        el stock descontado de las lineas anteriores."""
        ids = [item.producto_id for item in datos.items]
        if len(ids) != len(set(ids)):
            # dos lineas del mismo producto descontarian stock dos veces y
            # confundirian el detalle: se pide una sola linea por producto
            raise ProductoRepetido

        with self.uow as uow:
            pedido = Pedido(
                usuario_id=usuario_id,
                estado=EstadoPedido.PENDIENTE,
                forma_pago=datos.forma_pago.value,
                direccion_entrega=datos.direccion_entrega,
                notas=datos.notas,
                total=0.0,
            )
            uow.pedidos.add(pedido)

            total = 0.0
            for item in datos.items:
                producto = uow.productos.get_by_id(item.producto_id)
                if producto is None or not producto.activo:
                    raise ProductoNoEncontrado
                if not producto.disponible:
                    raise ProductoNoDisponible
                if producto.stock < item.cantidad:
                    raise StockInsuficiente

                producto.stock -= item.cantidad
                uow.productos.add(producto)

                # la linea copia nombre y precio: si el producto cambia despues,
                # este pedido sigue reflejando lo que se compro (RN-05)
                subtotal = producto.precio_base * item.cantidad
                linea = DetallePedido(
                    pedido_id=pedido.id or 0,
                    producto_id=producto.id or 0,
                    cantidad=item.cantidad,
                    nombre_producto=producto.nombre,
                    precio_unitario=producto.precio_base,
                    subtotal=subtotal,
                )
                uow.session.add(linea)
                total += subtotal

            pedido.total = total
            pedido.updated_at = datetime.now(timezone.utc)
            uow.pedidos.add(pedido)

            uow.session.refresh(pedido)
            return PedidoRead.model_validate(pedido, from_attributes=True)

    # --------------------------------------------------------------- listar

    def listar(
        self,
        usuario_id: int | None,
        skip: int = 0,
        limit: int = 20,
        estado: str | None = None,
    ) -> PedidosPaginados:
        """RN-04: el user recibe su usuario_id y solo ve lo suyo; el admin
        recibe None y ve todo."""
        with self.uow as uow:
            total, pedidos = uow.pedidos.list_by_usuario(usuario_id, skip, limit, estado)
            return PedidosPaginados(
                total=total,
                items=[PedidoRead.model_validate(p, from_attributes=True) for p in pedidos],
            )

    def obtener(self, pedido_id: int, usuario_id: int, es_admin: bool) -> PedidoRead:
        with self.uow as uow:
            pedido = uow.pedidos.get_by_id(pedido_id)
            if pedido is None:
                raise PedidoNoEncontrado
            if not es_admin and pedido.usuario_id != usuario_id:
                raise PedidoAjeno
            return PedidoRead.model_validate(pedido, from_attributes=True)

    # ------------------------------------------------------ cambios de estado

    def _restituir_stock(self, uow: PedidoUnitOfWork, pedido: Pedido) -> None:
        """RN-03: devuelve al catalogo lo que el pedido habia reservado."""
        for linea in pedido.items:
            producto = uow.productos.get_by_id(linea.producto_id)
            if producto is not None:
                producto.stock += linea.cantidad
                uow.productos.add(producto)

    def cambiar_estado(self, pedido_id: int, cambio: CambioEstado) -> PedidoRead:
        """RN-02 y RN-03, por el admin."""
        with self.uow as uow:
            pedido = uow.pedidos.get_by_id(pedido_id)
            if pedido is None:
                raise PedidoNoEncontrado

            actual = EstadoPedido(pedido.estado)
            if cambio.estado not in TRANSICIONES[actual]:
                raise TransicionInvalida

            if cambio.estado is EstadoPedido.CANCELADO:
                self._restituir_stock(uow, pedido)

            pedido.estado = cambio.estado.value
            pedido.updated_at = datetime.now(timezone.utc)
            uow.pedidos.add(pedido)
            return PedidoRead.model_validate(pedido, from_attributes=True)

    def cancelar_propio(self, pedido_id: int, usuario_id: int) -> PedidoRead:
        """RN-03 y RN-04: el dueño cancela, pero solo mientras esta PENDIENTE."""
        with self.uow as uow:
            pedido = uow.pedidos.get_by_id(pedido_id)
            if pedido is None:
                raise PedidoNoEncontrado
            if pedido.usuario_id != usuario_id:
                raise PedidoAjeno
            if pedido.estado != EstadoPedido.PENDIENTE:
                raise TransicionInvalida

            self._restituir_stock(uow, pedido)
            pedido.estado = EstadoPedido.CANCELADO.value
            pedido.updated_at = datetime.now(timezone.utc)
            uow.pedidos.add(pedido)
            return PedidoRead.model_validate(pedido, from_attributes=True)

    # -------------------------------------------------------------- resumen

    def resumen(self) -> ResumenPedidos:
        with self.uow as uow:
            return ResumenPedidos(
                pendientes=uow.pedidos.count_by_estado(EstadoPedido.PENDIENTE),
                en_preparacion=uow.pedidos.count_by_estado(EstadoPedido.EN_PREPARACION),
                entregados=uow.pedidos.count_by_estado(EstadoPedido.ENTREGADO),
                cancelados=uow.pedidos.count_by_estado(EstadoPedido.CANCELADO),
                pedidos_hoy=uow.pedidos.count_hoy(),
                ingresos_entregados=uow.pedidos.ingresos_entregados(),
            )
