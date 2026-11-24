"""Prueba de humo de la API: recorre el flujo completo y verifica las reglas
de negocio con asserts. No es un framework de tests, se corre a mano:

    python check_api.py

Usa una base SQLite temporal propia, no toca la base de desarrollo.
"""

import os
import tempfile
from pathlib import Path

BASE = Path(tempfile.gettempdir()) / "foodstore_check.db"
BASE.unlink(missing_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{BASE.as_posix()}"

from fastapi.testclient import TestClient  # noqa: E402

from app.db.seed import run as seed  # noqa: E402
from app.main import app  # noqa: E402

API = "/api/v1"
ok = 0


def check(condicion: bool, descripcion: str) -> None:
    global ok
    assert condicion, f"FALLO: {descripcion}"
    ok += 1
    print(f"  ok  {descripcion}")


seed()
cliente = TestClient(app)
admin = TestClient(app)

print("\nAutenticación")
r = cliente.post(f"{API}/auth/register", json={
    "username": "tester", "full_name": "Tester QA",
    "email": "tester@foodstore.com", "password": "Test1234!",
})
check(r.status_code == 201, "registro responde 201")
check("hashed_password" not in r.json(), "el registro no expone el hash")
check(r.json()["role"] == "user", "el registro público crea rol user")

r = cliente.post(f"{API}/auth/register", json={
    "username": "tester", "full_name": "Otro",
    "email": "otro@foodstore.com", "password": "Test1234!",
})
check(r.status_code == 409, "username duplicado responde 409")

r = cliente.post(f"{API}/auth/token", data={"username": "tester", "password": "mal"})
check(r.status_code == 401, "credenciales incorrectas responden 401")

r = cliente.post(f"{API}/auth/token", data={"username": "tester", "password": "Test1234!"})
check(r.status_code == 200, "login responde 200")
check("access_token" in r.cookies, "el login deja la cookie access_token")
check("token" not in r.text.lower(), "el cuerpo del login no trae el token")

r = admin.post(f"{API}/auth/token", data={"username": "admin", "password": "Admin1234!"})
check(r.status_code == 200, "login del admin del seed")

sin_sesion = TestClient(app)
check(sin_sesion.get(f"{API}/auth/me").status_code == 401, "/auth/me sin cookie responde 401")
check(cliente.get(f"{API}/auth/me").json()["username"] == "tester", "/auth/me devuelve el usuario")

print("\nCatálogo y permisos")
check(sin_sesion.get(f"{API}/categorias").status_code == 200, "el catálogo de categorías es público")

r = cliente.post(f"{API}/categorias", json={"nombre": "Postres"})
check(r.status_code == 403, "un user no puede crear categorías (403)")

r = admin.post(f"{API}/categorias", json={"nombre": "Postres", "descripcion": "Dulces"})
check(r.status_code == 201, "el admin crea una categoría (201)")
cat_id = r.json()["id"]

check(admin.post(f"{API}/categorias", json={"nombre": "Postres"}).status_code == 409,
      "nombre de categoría duplicado responde 409")

r = admin.post(f"{API}/productos", json={
    "nombre": "Flan casero", "precio_base": 3000.0, "stock": 5, "categoria_id": cat_id,
})
check(r.status_code == 201, "el admin crea un producto (201)")
flan_id = r.json()["id"]

r = admin.post(f"{API}/productos", json={
    "nombre": "Fantasma", "precio_base": 100.0, "stock": 1, "categoria_id": 9999,
})
check(r.status_code == 404, "crear producto con categoría inexistente responde 404")

r = sin_sesion.get(f"{API}/productos", params={"search": "flan"})
check(r.json()["total"] == 1, "la búsqueda por nombre encuentra el producto")
r = sin_sesion.get(f"{API}/productos", params={"search": "FLAN"})
check(r.json()["total"] == 1, "la búsqueda no distingue mayúsculas")
r = sin_sesion.get(f"{API}/productos", params={"categoria_id": cat_id})
check(r.json()["total"] == 1, "el filtro por categoría funciona")
r = sin_sesion.get(f"{API}/productos", params={"limit": 3})
check(len(r.json()["items"]) == 3 and r.json()["total"] > 3, "el listado pagina con limit")

print("\nPedidos: RN-01 crear")
r = cliente.post(f"{API}/pedidos", json={
    "items": [{"producto_id": flan_id, "cantidad": 2}],
    "forma_pago": "EFECTIVO", "direccion_entrega": "Av. Siempreviva 742",
})
check(r.status_code == 201, "crear pedido responde 201")
pedido = r.json()
pedido_id = pedido["id"]
check(pedido["estado"] == "PENDIENTE", "el pedido nace PENDIENTE")
check(pedido["total"] == 6000.0, "el total es la suma de los subtotales")
check(pedido["items"][0]["nombre_producto"] == "Flan casero", "la línea copia el nombre")
check(pedido["items"][0]["precio_unitario"] == 3000.0, "la línea copia el precio")
check(sin_sesion.get(f"{API}/productos/{flan_id}").json()["stock"] == 3, "el stock se descontó")

r = cliente.post(f"{API}/pedidos", json={
    "items": [{"producto_id": flan_id, "cantidad": 1}, {"producto_id": flan_id, "cantidad": 1}],
    "forma_pago": "EFECTIVO", "direccion_entrega": "Av. Siempreviva 742",
})
check(r.status_code == 400, "producto repetido responde 400")

r = cliente.post(f"{API}/pedidos", json={
    "items": [{"producto_id": flan_id, "cantidad": 999}],
    "forma_pago": "EFECTIVO", "direccion_entrega": "Av. Siempreviva 742",
})
check(r.status_code == 400, "stock insuficiente responde 400")
check(sin_sesion.get(f"{API}/productos/{flan_id}").json()["stock"] == 3,
      "tras el rollback el stock quedó intacto")

# rollback con varias lineas: la primera descuenta, la segunda falla
otro = admin.post(f"{API}/productos", json={
    "nombre": "Budín", "precio_base": 2000.0, "stock": 10, "categoria_id": cat_id,
}).json()
r = cliente.post(f"{API}/pedidos", json={
    "items": [
        {"producto_id": otro["id"], "cantidad": 1},
        {"producto_id": flan_id, "cantidad": 999},
    ],
    "forma_pago": "EFECTIVO", "direccion_entrega": "Av. Siempreviva 742",
})
check(r.status_code == 400, "un pedido con una línea inválida falla entero")
check(sin_sesion.get(f"{API}/productos/{otro['id']}").json()["stock"] == 10,
      "el rollback deshizo el descuento de la línea que sí era válida")

r = cliente.post(f"{API}/pedidos", json={
    "items": [{"producto_id": flan_id, "cantidad": 1}],
    "forma_pago": "EFECTIVO", "direccion_entrega": "abc",
})
check(r.status_code == 422, "dirección de menos de 5 caracteres responde 422")

r = cliente.post(f"{API}/pedidos", json={
    "items": [{"producto_id": flan_id, "cantidad": 1}],
    "forma_pago": "BITCOIN", "direccion_entrega": "Av. Siempreviva 742",
})
check(r.status_code == 422, "forma de pago inválida responde 422")

print("\nPedidos: RN-04 permisos")
ajeno = TestClient(app)
ajeno.post(f"{API}/auth/register", json={
    "username": "otro", "full_name": "Otro Cliente",
    "email": "otrocliente@foodstore.com", "password": "Otro1234!",
})
ajeno.post(f"{API}/auth/token", data={"username": "otro", "password": "Otro1234!"})
check(ajeno.get(f"{API}/pedidos/{pedido_id}").status_code == 403, "un pedido ajeno responde 403")
check(ajeno.get(f"{API}/pedidos").json()["total"] == 0, "el cliente solo ve sus pedidos")
check(admin.get(f"{API}/pedidos/{pedido_id}").status_code == 200, "el admin ve cualquier pedido")
check(admin.get(f"{API}/pedidos").json()["total"] >= 1, "el admin ve todos los pedidos")
check(cliente.get(f"{API}/pedidos/resumen").status_code == 403, "el resumen es solo del admin")

print("\nPedidos: RN-02 máquina de estados")
r = admin.patch(f"{API}/pedidos/{pedido_id}/estado", json={"estado": "ENTREGADO"})
check(r.status_code == 400, "PENDIENTE no puede saltar directo a ENTREGADO")

r = admin.patch(f"{API}/pedidos/{pedido_id}/estado", json={"estado": "EN_PREPARACION"})
check(r.status_code == 200, "PENDIENTE pasa a EN_PREPARACION")

check(ajeno.patch(f"{API}/pedidos/{pedido_id}/cancelar").status_code == 403,
      "no se puede cancelar un pedido ajeno")
check(cliente.patch(f"{API}/pedidos/{pedido_id}/cancelar").status_code == 400,
      "el cliente no cancela fuera de PENDIENTE")

r = admin.patch(f"{API}/pedidos/{pedido_id}/estado", json={"estado": "ENTREGADO"})
check(r.status_code == 200, "EN_PREPARACION pasa a ENTREGADO")
check(admin.patch(f"{API}/pedidos/{pedido_id}/estado", json={"estado": "CANCELADO"}).status_code == 400,
      "ENTREGADO es terminal")

print("\nPedidos: RN-03 cancelar restituye stock")
stock_antes = sin_sesion.get(f"{API}/productos/{flan_id}").json()["stock"]
nuevo = cliente.post(f"{API}/pedidos", json={
    "items": [{"producto_id": flan_id, "cantidad": 2}],
    "forma_pago": "TRANSFERENCIA", "direccion_entrega": "Calle Falsa 123",
}).json()
check(sin_sesion.get(f"{API}/productos/{flan_id}").json()["stock"] == stock_antes - 2,
      "el nuevo pedido descontó stock")

r = cliente.patch(f"{API}/pedidos/{nuevo['id']}/cancelar")
check(r.status_code == 200 and r.json()["estado"] == "CANCELADO", "el dueño cancela en PENDIENTE")
check(sin_sesion.get(f"{API}/productos/{flan_id}").json()["stock"] == stock_antes,
      "la cancelación restituyó el stock")

print("\nPedidos: RN-05 inmutabilidad")
admin.put(f"{API}/productos/{flan_id}", json={"precio_base": 9999.0})
r = cliente.get(f"{API}/pedidos/{pedido_id}")
check(r.json()["items"][0]["precio_unitario"] == 3000.0,
      "cambiar el precio del producto no altera un pedido ya emitido")
check(r.json()["total"] == 6000.0, "el total del pedido tampoco cambia")

print("\nResumen y usuarios")
r = admin.get(f"{API}/pedidos/resumen").json()
check(r["entregados"] == 1, "el resumen cuenta los entregados")
check(r["cancelados"] == 1, "el resumen cuenta los cancelados")
check(r["ingresos_entregados"] == 6000.0, "los ingresos suman solo los entregados")

usuarios = admin.get(f"{API}/admin/usuarios").json()
check(len(usuarios) >= 4, "el admin lista los usuarios")
yo = next(u for u in usuarios if u["username"] == "admin")
check(admin.post(f"{API}/admin/usuarios/{yo['id']}/desactivar").status_code == 400,
      "el admin no puede desactivarse a sí mismo")

victima = next(u for u in usuarios if u["username"] == "otro")
check(admin.post(f"{API}/admin/usuarios/{victima['id']}/desactivar").status_code == 200,
      "el admin desactiva a un usuario")
check(admin.post(f"{API}/admin/usuarios/{victima['id']}/desactivar").status_code == 200,
      "desactivar es idempotente")
check(ajeno.get(f"{API}/auth/me").status_code == 400,
      "la cuenta desactivada ya no pasa (400) aunque tenga cookie")
check(admin.post(f"{API}/admin/usuarios/{victima['id']}/activar").status_code == 200,
      "el admin reactiva al usuario")
check(admin.post(f"{API}/admin/usuarios/9999/desactivar").status_code == 404,
      "usuario inexistente responde 404")

print("\nBaja lógica")
check(admin.delete(f"{API}/productos/{flan_id}").status_code == 204, "DELETE producto responde 204")
check(sin_sesion.get(f"{API}/productos/{flan_id}").status_code == 404,
      "el producto dado de baja se trata como inexistente")
check(admin.delete(f"{API}/productos/{flan_id}").status_code == 404,
      "no se puede dar de baja dos veces")
check(admin.post(f"{API}/categorias", json={"nombre": "Postres"}).status_code == 409,
      "el nombre de una categoría no se libera con la baja")

print("\nSesión")
check(cliente.post(f"{API}/auth/logout").status_code == 200, "logout responde 200")

print(f"\n{ok} verificaciones OK")

# en Windows el archivo sigue tomado por el engine hasta que se cierra
from app.core.database import engine  # noqa: E402

engine.dispose()
BASE.unlink(missing_ok=True)
