"""Reune los modelos de todos los modulos.

SQLModel resuelve las relaciones entre tablas por nombre de clase, asi que todas
tienen que estar importadas antes del create_all y antes de usar cualquier
Relationship. Importar este modulo garantiza ese orden.
"""

from app.modules.categorias.models import Categoria
from app.modules.pedidos.models import DetallePedido, EstadoPedido, FormaPago, Pedido
from app.modules.productos.models import Producto
from app.modules.usuarios.models import Usuario

__all__ = [
    "Categoria",
    "DetallePedido",
    "EstadoPedido",
    "FormaPago",
    "Pedido",
    "Producto",
    "Usuario",
]
