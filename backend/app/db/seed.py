"""Carga inicial: usuario admin, categorias y productos.

Idempotente: se puede correr varias veces sin duplicar nada. Busca cada
registro por su campo unico y solo inserta lo que falta.

    python -m app.db.seed
"""

from sqlmodel import Session, select

from app.core.database import create_all_tables, engine
from app.core.security import hash_password
from app.db.models import Categoria, Producto, Usuario

ADMIN = {
    "username": "admin",
    "full_name": "Administrador Food Store",
    "email": "admin@foodstore.com",
    "password": "Admin1234!",
    "role": "admin",
}

CLIENTE_DEMO = {
    "username": "cliente",
    "full_name": "Cliente de Prueba",
    "email": "cliente@foodstore.com",
    "password": "Cliente1234!",
    "role": "user",
}

CATEGORIAS = [
    ("Hamburguesas", "Hamburguesas artesanales con guarnición"),
    ("Pizzas", "Pizzas a la piedra, porción o entera"),
    ("Empanadas", "Empanadas al horno, por unidad o docena"),
    ("Bebidas", "Gaseosas, aguas y cervezas"),
]

# (nombre, categoria, descripcion, precio, stock)
PRODUCTOS = [
    ("Hamburguesa Clásica", "Hamburguesas", "Carne, lechuga, tomate y queso", 7500.0, 40),
    ("Hamburguesa Doble Cheddar", "Hamburguesas", "Doble carne, doble cheddar y panceta", 9800.0, 25),
    ("Pizza Muzzarella", "Pizzas", "Ocho porciones con muzzarella y aceitunas", 11000.0, 20),
    ("Pizza Napolitana", "Pizzas", "Muzzarella, tomate en rodajas y ajo", 12500.0, 18),
    ("Empanada de Carne", "Empanadas", "Carne cortada a cuchillo", 1400.0, 120),
    ("Empanada de Jamón y Queso", "Empanadas", "Jamón cocido y muzzarella", 1300.0, 100),
    ("Gaseosa 1.5L", "Bebidas", "Línea Coca-Cola", 2800.0, 60),
    ("Agua Mineral 500ml", "Bebidas", "Con o sin gas", 1500.0, 80),
]


def crear_usuario(session: Session, datos: dict[str, str]) -> None:
    existente = session.exec(select(Usuario).where(Usuario.username == datos["username"])).first()
    if existente:
        print(f"  usuario '{datos['username']}' ya existe")
        return

    session.add(
        Usuario(
            username=datos["username"],
            full_name=datos["full_name"],
            email=datos["email"],
            hashed_password=hash_password(datos["password"]),
            role=datos["role"],
        )
    )
    print(f"  usuario '{datos['username']}' creado ({datos['role']})")


def run() -> None:
    create_all_tables()

    with Session(engine) as session:
        print("Usuarios:")
        crear_usuario(session, ADMIN)
        crear_usuario(session, CLIENTE_DEMO)

        print("Categorías:")
        por_nombre: dict[str, Categoria] = {}
        for nombre, descripcion in CATEGORIAS:
            categoria = session.exec(select(Categoria).where(Categoria.nombre == nombre)).first()
            if categoria is None:
                categoria = Categoria(nombre=nombre, descripcion=descripcion)
                session.add(categoria)
                session.flush()
                print(f"  '{nombre}' creada")
            else:
                print(f"  '{nombre}' ya existe")
            por_nombre[nombre] = categoria

        print("Productos:")
        for nombre, categoria_nombre, descripcion, precio, stock in PRODUCTOS:
            existente = session.exec(select(Producto).where(Producto.nombre == nombre)).first()
            if existente:
                print(f"  '{nombre}' ya existe")
                continue

            session.add(
                Producto(
                    nombre=nombre,
                    descripcion=descripcion,
                    precio_base=precio,
                    stock=stock,
                    categoria_id=por_nombre[categoria_nombre].id or 0,
                )
            )
            print(f"  '{nombre}' creado")

        session.commit()

    print("\nSeed completo.")
    print(f"  admin:   {ADMIN['username']} / {ADMIN['password']}")
    print(f"  cliente: {CLIENTE_DEMO['username']} / {CLIENTE_DEMO['password']}")


if __name__ == "__main__":
    run()
