from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import get_current_active_user, require_role
from app.modules.pedidos.schemas import (
    CambioEstado,
    PedidoCreate,
    PedidoRead,
    PedidosPaginados,
    ResumenPedidos,
)
from app.modules.pedidos.service import (
    PedidoAjeno,
    PedidoNoEncontrado,
    PedidoService,
    ProductoNoDisponible,
    ProductoNoEncontrado,
    ProductoRepetido,
    StockInsuficiente,
    TransicionInvalida,
)
from app.modules.pedidos.unit_of_work import PedidoUnitOfWork
from app.modules.usuarios.models import Usuario

router = APIRouter(prefix="/pedidos", tags=["pedidos"])

solo_admin = require_role(["admin"])

NO_ENCONTRADO = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
AJENO = HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El pedido pertenece a otro usuario")


def get_pedido_service() -> PedidoService:
    return PedidoService(PedidoUnitOfWork())


@router.post("", response_model=PedidoRead, status_code=status.HTTP_201_CREATED)
def crear(
    datos: PedidoCreate,
    service: PedidoService = Depends(get_pedido_service),
    usuario: Usuario = Depends(get_current_active_user),
) -> PedidoRead:
    try:
        return service.crear(usuario.id or 0, datos)
    except ProductoNoEncontrado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alguno de los productos no existe o fue dado de baja",
        )
    except ProductoRepetido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hay un producto repetido en el pedido",
        )
    except ProductoNoDisponible:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Alguno de los productos no está disponible",
        )
    except StockInsuficiente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay stock suficiente para alguno de los productos",
        )


@router.get("", response_model=PedidosPaginados)
def listar(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    estado: str | None = None,
    service: PedidoService = Depends(get_pedido_service),
    usuario: Usuario = Depends(get_current_active_user),
) -> PedidosPaginados:
    # el admin ve todos los pedidos; el user, solo los propios
    filtro_usuario = None if usuario.role == "admin" else usuario.id
    return service.listar(filtro_usuario, skip, limit, estado)


# se declara antes de /{pedido_id}, si no "resumen" entra como id y da 422
@router.get("/resumen", response_model=ResumenPedidos)
def resumen(
    service: PedidoService = Depends(get_pedido_service),
    _: Usuario = Depends(solo_admin),
) -> ResumenPedidos:
    return service.resumen()


@router.get("/{pedido_id}", response_model=PedidoRead)
def obtener(
    pedido_id: int,
    service: PedidoService = Depends(get_pedido_service),
    usuario: Usuario = Depends(get_current_active_user),
) -> PedidoRead:
    try:
        return service.obtener(pedido_id, usuario.id or 0, usuario.role == "admin")
    except PedidoNoEncontrado:
        raise NO_ENCONTRADO
    except PedidoAjeno:
        raise AJENO


@router.patch("/{pedido_id}/estado", response_model=PedidoRead)
def cambiar_estado(
    pedido_id: int,
    cambio: CambioEstado,
    service: PedidoService = Depends(get_pedido_service),
    _: Usuario = Depends(solo_admin),
) -> PedidoRead:
    try:
        return service.cambiar_estado(pedido_id, cambio)
    except PedidoNoEncontrado:
        raise NO_ENCONTRADO
    except TransicionInvalida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esa transición de estado no está permitida",
        )


@router.patch("/{pedido_id}/cancelar", response_model=PedidoRead)
def cancelar(
    pedido_id: int,
    service: PedidoService = Depends(get_pedido_service),
    usuario: Usuario = Depends(get_current_active_user),
) -> PedidoRead:
    try:
        return service.cancelar_propio(pedido_id, usuario.id or 0)
    except PedidoNoEncontrado:
        raise NO_ENCONTRADO
    except PedidoAjeno:
        raise AJENO
    except TransicionInvalida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se puede cancelar un pedido PENDIENTE",
        )
