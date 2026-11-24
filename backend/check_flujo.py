"""Recorre contra la API ya levantada el mismo flujo que se muestra en el video:
registro, compra como cliente, gestion como admin y cancelacion con restitucion
de stock. Deja los datos cargados en la base de desarrollo.

Requiere el backend corriendo:  uvicorn app.main:app --reload
Uso:  python check_flujo.py
"""

import sys
from datetime import datetime

import httpx

API = "http://127.0.0.1:8000/api/v1"
ok = 0


def check(condicion: bool, descripcion: str) -> None:
    global ok
    if not condicion:
        print(f"  FALLO  {descripcion}")
        sys.exit(1)
    ok += 1
    print(f"  ok  {descripcion}")


# un username distinto en cada corrida para poder repetirla sin chocar con el 409
sufijo = datetime.now().strftime("%H%M%S")
usuario = f"cliente{sufijo}"

cliente = httpx.Client(base_url=API, timeout=10.0)
admin = httpx.Client(base_url=API, timeout=10.0)
anonimo = httpx.Client(base_url=API, timeout=10.0)

try:
    anonimo.get("/productos")
except httpx.ConnectError:
    print("El backend no responde en http://127.0.0.1:8000")
    print("Levantalo con: uvicorn app.main:app --reload")
    sys.exit(1)

print("1. El cliente se registra e ingresa")
r = cliente.post("/auth/register", json={
    "username": usuario,
    "full_name": "Cliente del Video",
    "email": f"{usuario}@foodstore.com",
    "password": "Video1234!",
})
check(r.status_code == 201, f"registro de '{usuario}' (201)")
check(r.json()["role"] == "user", "el registro publico crea rol user")

r = cliente.post("/auth/token", data={"username": usuario, "password": "Video1234!"})
check(r.status_code == 200, "login del cliente")
check("access_token" in r.cookies, "la sesion viaja en la cookie HttpOnly")

r = admin.post("/auth/token", data={"username": "admin", "password": "Admin1234!"})
check(r.status_code == 200, "login del admin")

print("\n2. Recorre el catalogo")
r = anonimo.get("/productos", params={"limit": 3})
check(r.status_code == 200, "el catalogo es publico")
catalogo = r.json()
check(catalogo["total"] >= 8, f"hay {catalogo['total']} productos cargados por el seed")

r = anonimo.get("/productos", params={"search": "pizza"})
check(r.json()["total"] >= 2, "la busqueda por nombre filtra")

producto = catalogo["items"][0]
stock_inicial = producto["stock"]
print(f"     producto elegido: {producto['nombre']} (stock {stock_inicial})")

print("\n3. Confirma el pedido")
r = cliente.post("/pedidos", json={
    "items": [{"producto_id": producto["id"], "cantidad": 2}],
    "forma_pago": "TRANSFERENCIA",
    "direccion_entrega": "Av. Rivadavia 1234, CABA",
    "notas": "Tocar el timbre B",
})
check(r.status_code == 201, "el pedido se crea (201)")
pedido = r.json()
check(pedido["estado"] == "PENDIENTE", "nace en PENDIENTE")
check(pedido["total"] == producto["precio_base"] * 2, "el total es la suma de los subtotales")
check(pedido["items"][0]["nombre_producto"] == producto["nombre"], "la linea copia el nombre")

stock_tras_compra = anonimo.get(f"/productos/{producto['id']}").json()["stock"]
check(stock_tras_compra == stock_inicial - 2, f"el stock bajo de {stock_inicial} a {stock_tras_compra}")

print("\n4. El admin gestiona el pedido")
check(cliente.get("/pedidos/resumen").status_code == 403, "el resumen es solo del admin")

r = admin.get("/pedidos/resumen")
check(r.status_code == 200, "el admin ve el resumen")
print(f"     pendientes: {r.json()['pendientes']}, entregados: {r.json()['entregados']}")

r = admin.patch(f"/pedidos/{pedido['id']}/estado", json={"estado": "ENTREGADO"})
check(r.status_code == 400, "PENDIENTE no puede saltar directo a ENTREGADO")

r = admin.patch(f"/pedidos/{pedido['id']}/estado", json={"estado": "EN_PREPARACION"})
check(r.status_code == 200, "el admin lo pasa a EN_PREPARACION")

print("\n5. Cancelacion con restitucion de stock")
r = cliente.post("/pedidos", json={
    "items": [{"producto_id": producto["id"], "cantidad": 3}],
    "forma_pago": "EFECTIVO",
    "direccion_entrega": "Av. Rivadavia 1234, CABA",
    "notas": None,
})
check(r.status_code == 201, "el cliente hace un segundo pedido")
segundo = r.json()

stock_con_dos = anonimo.get(f"/productos/{producto['id']}").json()["stock"]
check(stock_con_dos == stock_tras_compra - 3, "el segundo pedido tambien descuenta")

r = cliente.patch(f"/pedidos/{segundo['id']}/cancelar")
check(r.status_code == 200, "el dueño cancela su pedido PENDIENTE")
check(r.json()["estado"] == "CANCELADO", "queda CANCELADO")

stock_final = anonimo.get(f"/productos/{producto['id']}").json()["stock"]
check(stock_final == stock_tras_compra, f"el stock volvio a {stock_final}: se restituyeron las 3 unidades")

print("\n6. Permisos")
check(cliente.post("/categorias", json={"nombre": "Prueba"}).status_code == 403,
      "un cliente no puede crear categorias")
check(anonimo.get("/pedidos").status_code == 401, "sin sesion no se ven pedidos")
check(cliente.get("/pedidos").json()["total"] == 2, "el cliente ve solo sus 2 pedidos")
check(admin.get("/pedidos").json()["total"] >= 2, "el admin ve todos")

print(f"\n{ok} verificaciones OK contra la API real")
print(f"Quedaron en la base los pedidos {pedido['id']} (EN_PREPARACION) y {segundo['id']} (CANCELADO)")
print(f"Usuario de prueba: {usuario} / Video1234!")
