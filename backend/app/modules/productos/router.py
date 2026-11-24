from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.core.deps import require_role
from app.modules.productos.schemas import (
    ProductoCreate,
    ProductoRead,
    ProductosPaginados,
    ProductoStockUpdate,
    ProductoUpdate,
)
from app.modules.productos.service import (
    CategoriaNoEncontrada,
    ProductoNoEncontrado,
    ProductoService,
)
from app.modules.productos.unit_of_work import ProductoUnitOfWork
from app.modules.usuarios.models import Usuario

router = APIRouter(prefix="/productos", tags=["productos"])

solo_admin = require_role(["admin"])

NO_ENCONTRADO = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
CATEGORIA_INVALIDA = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="La categoría no existe o está dada de baja"
)


def get_producto_service() -> ProductoService:
    return ProductoService(ProductoUnitOfWork())


@router.get("", response_model=ProductosPaginados)
def listar(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    categoria_id: int | None = None,
    disponible: bool | None = None,
    service: ProductoService = Depends(get_producto_service),
) -> ProductosPaginados:
    return service.listar(skip, limit, search, categoria_id, disponible)


@router.get("/{producto_id}", response_model=ProductoRead)
def obtener(
    producto_id: int,
    service: ProductoService = Depends(get_producto_service),
) -> ProductoRead:
    try:
        return service.obtener(producto_id)
    except ProductoNoEncontrado:
        raise NO_ENCONTRADO


@router.post("", response_model=ProductoRead, status_code=status.HTTP_201_CREATED)
def crear(
    datos: ProductoCreate,
    service: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(solo_admin),
) -> ProductoRead:
    try:
        return service.crear(datos)
    except CategoriaNoEncontrada:
        raise CATEGORIA_INVALIDA


@router.put("/{producto_id}", response_model=ProductoRead)
def actualizar(
    producto_id: int,
    datos: ProductoUpdate,
    service: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(solo_admin),
) -> ProductoRead:
    try:
        return service.actualizar(producto_id, datos)
    except ProductoNoEncontrado:
        raise NO_ENCONTRADO
    except CategoriaNoEncontrada:
        raise CATEGORIA_INVALIDA


@router.patch("/{producto_id}/stock", response_model=ProductoRead)
def actualizar_stock(
    producto_id: int,
    datos: ProductoStockUpdate,
    service: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(solo_admin),
) -> ProductoRead:
    try:
        return service.actualizar_stock(producto_id, datos)
    except ProductoNoEncontrado:
        raise NO_ENCONTRADO


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(
    producto_id: int,
    service: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(solo_admin),
) -> Response:
    try:
        service.eliminar(producto_id)
    except ProductoNoEncontrado:
        raise NO_ENCONTRADO
    return Response(status_code=status.HTTP_204_NO_CONTENT)
