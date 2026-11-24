from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.deps import require_role
from app.modules.categorias.schemas import CategoriaCreate, CategoriaRead, CategoriaUpdate
from app.modules.categorias.service import (
    CategoriaNoEncontrada,
    CategoriaService,
    NombreDuplicado,
)
from app.modules.categorias.unit_of_work import CategoriaUnitOfWork
from app.modules.usuarios.models import Usuario

router = APIRouter(prefix="/categorias", tags=["categorias"])

solo_admin = require_role(["admin"])

NO_ENCONTRADA = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
NOMBRE_EN_USO = HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una categoría con ese nombre")


def get_categoria_service() -> CategoriaService:
    """El router pide el Service ya armado y nunca abre el Unit of Work."""
    return CategoriaService(CategoriaUnitOfWork())


@router.get("", response_model=list[CategoriaRead])
def listar(service: CategoriaService = Depends(get_categoria_service)) -> list[CategoriaRead]:
    return service.listar()


@router.get("/{categoria_id}", response_model=CategoriaRead)
def obtener(
    categoria_id: int,
    service: CategoriaService = Depends(get_categoria_service),
) -> CategoriaRead:
    try:
        return service.obtener(categoria_id)
    except CategoriaNoEncontrada:
        raise NO_ENCONTRADA


@router.post("", response_model=CategoriaRead, status_code=status.HTTP_201_CREATED)
def crear(
    datos: CategoriaCreate,
    service: CategoriaService = Depends(get_categoria_service),
    _: Usuario = Depends(solo_admin),
) -> CategoriaRead:
    try:
        return service.crear(datos)
    except NombreDuplicado:
        raise NOMBRE_EN_USO


@router.put("/{categoria_id}", response_model=CategoriaRead)
def actualizar(
    categoria_id: int,
    datos: CategoriaUpdate,
    service: CategoriaService = Depends(get_categoria_service),
    _: Usuario = Depends(solo_admin),
) -> CategoriaRead:
    try:
        return service.actualizar(categoria_id, datos)
    except CategoriaNoEncontrada:
        raise NO_ENCONTRADA
    except NombreDuplicado:
        raise NOMBRE_EN_USO


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(
    categoria_id: int,
    service: CategoriaService = Depends(get_categoria_service),
    _: Usuario = Depends(solo_admin),
) -> Response:
    try:
        service.eliminar(categoria_id)
    except CategoriaNoEncontrada:
        raise NO_ENCONTRADA
    return Response(status_code=status.HTTP_204_NO_CONTENT)
