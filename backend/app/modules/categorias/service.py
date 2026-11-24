from app.modules.categorias.models import Categoria
from app.modules.categorias.schemas import CategoriaCreate, CategoriaRead, CategoriaUpdate
from app.modules.categorias.unit_of_work import CategoriaUnitOfWork


class CategoriaNoEncontrada(Exception):
    """La categoria no existe o esta dada de baja. El router responde 404."""


class NombreDuplicado(Exception):
    """Ya hay una categoria con ese nombre. El router responde 409."""


class CategoriaService:
    def __init__(self, uow: CategoriaUnitOfWork) -> None:
        self.uow = uow

    def listar(self) -> list[CategoriaRead]:
        with self.uow as uow:
            return [CategoriaRead.model_validate(c, from_attributes=True) for c in uow.categorias.list_activas()]

    def obtener(self, categoria_id: int) -> CategoriaRead:
        with self.uow as uow:
            categoria = uow.categorias.get_by_id(categoria_id)
            # una categoria dada de baja se trata como inexistente
            if categoria is None or not categoria.activo:
                raise CategoriaNoEncontrada
            return CategoriaRead.model_validate(categoria, from_attributes=True)

    def crear(self, datos: CategoriaCreate) -> CategoriaRead:
        with self.uow as uow:
            if uow.categorias.get_by_nombre(datos.nombre):
                raise NombreDuplicado
            categoria = Categoria(nombre=datos.nombre, descripcion=datos.descripcion)
            uow.categorias.add(categoria)
            return CategoriaRead.model_validate(categoria, from_attributes=True)

    def actualizar(self, categoria_id: int, datos: CategoriaUpdate) -> CategoriaRead:
        with self.uow as uow:
            categoria = uow.categorias.get_by_id(categoria_id)
            if categoria is None or not categoria.activo:
                raise CategoriaNoEncontrada

            if datos.nombre is not None and datos.nombre != categoria.nombre:
                if uow.categorias.get_by_nombre(datos.nombre):
                    raise NombreDuplicado
                categoria.nombre = datos.nombre

            if datos.descripcion is not None:
                categoria.descripcion = datos.descripcion

            uow.categorias.add(categoria)
            return CategoriaRead.model_validate(categoria, from_attributes=True)

    def eliminar(self, categoria_id: int) -> None:
        """Baja logica: activo = False. No se borra la fila ni se liberan sus productos."""
        with self.uow as uow:
            categoria = uow.categorias.get_by_id(categoria_id)
            if categoria is None or not categoria.activo:
                raise CategoriaNoEncontrada
            categoria.activo = False
            uow.categorias.add(categoria)
