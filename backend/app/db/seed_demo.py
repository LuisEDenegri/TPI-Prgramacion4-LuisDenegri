"""Pedidos de prueba para la demostracion (opcional, aparte del seed base).

Corre primero el seed base y despues agrega dos clientes mas y siete pedidos
repartidos en los cuatro estados, con fechas de los ultimos dias. Asi el panel
del admin arranca con datos: el resumen tiene ingresos, y el listado muestra
filas terminales (sin botones) al lado de filas pendientes.

    python -m app.db.seed_demo           # agrega lo que falta
    python -m app.db.seed_demo --reset   # borra TODA la base y la vuelve a cargar

Idempotente: si los clientes de prueba ya tienen pedidos, no agrega otros.
Los pedidos no cancelados descuentan stock, como si se hubieran hecho desde la
app; el cancelado no, porque ya lo devolvio.

La "Hamburguesa Clásica" queda sin tocar a proposito (stock 40), para que la
compra del video arranque de un numero redondo.

Va separado de seed.py porque check_api.py corre ese seed y cuenta pedidos:
mezclar estos datos ahi le cambiaria los resultados.
"""

import sys
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, SQLModel, col, select

from app.core.database import engine
from app.core.security import hash_password
from app.db.models import DetallePedido, EstadoPedido, FormaPago, Pedido, Producto, Usuario
from app.db.seed import run as seed_base

CLIENTES = [
    {
        "username": "maria",
        "full_name": "María Gómez",
        "email": "maria@foodstore.com",
        "password": "Demo1234!",
    },
    {
        "username": "juan",
        "full_name": "Juan Pérez",
        "email": "juan@foodstore.com",
        "password": "Demo1234!",
    },
]

# (usuario, estado, antiguedad, forma de pago, direccion, [(producto, cantidad, precio o None)])
# precio None copia el precio actual del producto; un numero simula que el
# producto costaba otra cosa cuando se compro (RN-05).
PEDIDOS = [
    (
        "maria", EstadoPedido.ENTREGADO, timedelta(days=6, hours=3),
        FormaPago.EFECTIVO, "Av. Corrientes 3456, CABA",
        [("Pizza Muzzarella", 1, 10000.0), ("Gaseosa 1.5L", 1, None)],
    ),
    (
        "juan", EstadoPedido.ENTREGADO, timedelta(days=4, hours=5),
        FormaPago.TRANSFERENCIA, "Calle 7 nro 1520, La Plata",
        [("Hamburguesa Doble Cheddar", 2, None), ("Agua Mineral 500ml", 2, None)],
    ),
    (
        "cliente", EstadoPedido.ENTREGADO, timedelta(days=3, hours=1),
        FormaPago.TRANSFERENCIA, "San Martín 850, Rosario",
        [("Empanada de Carne", 12, None)],
    ),
    (
        "juan", EstadoPedido.CANCELADO, timedelta(days=2, hours=4),
        FormaPago.EFECTIVO, "Calle 7 nro 1520, La Plata",
        [("Pizza Napolitana", 1, None)],
    ),
    (
        "maria", EstadoPedido.EN_PREPARACION, timedelta(minutes=50),
        FormaPago.EFECTIVO, "Av. Corrientes 3456, CABA",
        [("Hamburguesa Doble Cheddar", 1, None), ("Gaseosa 1.5L", 2, None)],
    ),
    (
        "cliente", EstadoPedido.PENDIENTE, timedelta(minutes=25),
        FormaPago.EFECTIVO, "San Martín 850, Rosario",
        [("Empanada de Jamón y Queso", 6, None)],
    ),
    (
        "juan", EstadoPedido.PENDIENTE, timedelta(minutes=10),
        FormaPago.TRANSFERENCIA, "Calle 7 nro 1520, La Plata",
        [("Pizza Napolitana", 1, None), ("Agua Mineral 500ml", 1, None)],
    ),
]


def resetear() -> None:
    import app.db.models  # noqa: F401  registra las tablas antes del drop

    SQLModel.metadata.drop_all(engine)
    print("Base borrada.\n")


def crear_clientes(session: Session) -> dict[str, Usuario]:
    print("Clientes de prueba:")
    for datos in CLIENTES:
        existente = session.exec(select(Usuario).where(Usuario.username == datos["username"])).first()
        if existente:
            print(f"  '{datos['username']}' ya existe")
            continue
        session.add(
            Usuario(
                username=datos["username"],
                full_name=datos["full_name"],
                email=datos["email"],
                hashed_password=hash_password(datos["password"]),
                role="user",
            )
        )
        print(f"  '{datos['username']}' creado")
    session.flush()

    nombres = [c["username"] for c in CLIENTES] + ["cliente"]
    usuarios = session.exec(select(Usuario).where(col(Usuario.username).in_(nombres))).all()
    return {u.username: u for u in usuarios}


def crear_pedidos(session: Session, usuarios: dict[str, Usuario]) -> None:
    print("Pedidos de prueba:")
    ids = [u.id for u in usuarios.values()]
    ya_hay = session.exec(select(Pedido).where(col(Pedido.usuario_id).in_(ids))).first()
    if ya_hay:
        print("  los clientes de prueba ya tienen pedidos, no se agregan otros")
        return

    productos = {p.nombre: p for p in session.exec(select(Producto)).all()}
    ahora = datetime.now(timezone.utc)

    for username, estado, antiguedad, forma_pago, direccion, lineas in PEDIDOS:
        fecha = ahora - antiguedad
        pedido = Pedido(
            usuario_id=usuarios[username].id or 0,
            estado=estado.value,
            forma_pago=forma_pago.value,
            direccion_entrega=direccion,
            created_at=fecha,
            # los que avanzaron de estado se movieron un rato despues de crearse
            updated_at=fecha if estado is EstadoPedido.PENDIENTE else fecha + timedelta(minutes=40),
        )
        session.add(pedido)
        session.flush()

        total = 0.0
        for nombre, cantidad, precio in lineas:
            producto = productos[nombre]
            precio_unitario = precio if precio is not None else producto.precio_base
            subtotal = precio_unitario * cantidad
            session.add(
                DetallePedido(
                    pedido_id=pedido.id or 0,
                    producto_id=producto.id or 0,
                    cantidad=cantidad,
                    nombre_producto=producto.nombre,
                    precio_unitario=precio_unitario,
                    subtotal=subtotal,
                )
            )
            total += subtotal
            if estado is not EstadoPedido.CANCELADO:
                producto.stock -= cantidad
                session.add(producto)

        pedido.total = total
        session.add(pedido)
        print(f"  #{pedido.id} {username:<8} {estado.value:<15} ${total:,.0f}")


def run(reset: bool = False) -> None:
    if reset:
        resetear()

    seed_base()
    print()

    with Session(engine) as session:
        usuarios = crear_clientes(session)
        crear_pedidos(session, usuarios)
        session.commit()

    print("\nDemo lista.")
    print("  clientes extra: maria / Demo1234!   juan / Demo1234!")
    print("  correr justo antes de grabar: 'pedidos de hoy' cuenta las últimas 24 horas")


if __name__ == "__main__":
    run(reset="--reset" in sys.argv)
