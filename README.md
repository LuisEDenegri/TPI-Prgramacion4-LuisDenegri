# Food Store

Trabajo Práctico Integrador · Programación 4 · Tecnicatura Universitaria en Programación a Distancia (UTN)

Aplicación web para un negocio de comidas. Los clientes se registran, recorren el catálogo, arman
un carrito y confirman un pedido indicando dirección y forma de pago. El negocio administra
categorías, productos, stock, pedidos y usuarios desde un panel.

**Repositorio:** https://github.com/LuisEDenegri/TPI-Prgramacion4-LuisDenegri

Son dos proyectos independientes que se comunican por HTTP:

| | Carpeta | Stack |
|---|---|---|
| Backend | `backend/` | FastAPI + SQLModel + PostgreSQL, JWT en cookie HttpOnly |
| Frontend | `frontend/` | React 19 + TypeScript + Vite + Tailwind 4, TanStack Query/Form/Table, Zustand |

## Requisitos

- **Python** 3.11 a 3.13 (SQLModel 0.0.22 no funciona con 3.14)
- **Node.js** 20.19 o superior y **pnpm** 9 o superior
- **PostgreSQL** 15 o superior. Si tenés Docker, el `docker-compose.yml` de la raíz ya lo levanta
  configurado y es el camino más corto.

## Puesta en marcha

Los tres pasos van en orden: primero la base, después el backend, después el frontend. Hacen falta
dos terminales abiertas al final (una para la API, otra para el frontend).

### 1. Base de datos

Con Docker, desde la raíz del proyecto:

```bash
docker compose up -d
```

Levanta PostgreSQL 16 en el puerto 5432 con la base `foodstore_db` y el usuario `foodstore`
(contraseña `foodstore`). Los datos quedan en un volumen, así que sobreviven a `docker compose down`.

Si preferís un PostgreSQL ya instalado, creá la base a mano y ajustá `DATABASE_URL` en el paso
siguiente:

```sql
CREATE DATABASE foodstore_db;
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS y Linux
pip install -r requirements.txt
```

Copiá `backend/.env.example` como `backend/.env`. Si usás el Docker de arriba, los valores por
defecto del ejemplo ya sirven; solo cambiá `SECRET_KEY`. Para generar una:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Cargá los datos iniciales y levantá la API:

```bash
python -m app.db.seed
uvicorn app.main:app --reload
```

La API queda en `http://localhost:8000`, con la documentación en
[`/docs`](http://localhost:8000/docs) y [`/redoc`](http://localhost:8000/redoc).

### 3. Frontend

En otra terminal:

```bash
cd frontend
pnpm install
```

Copiá `frontend/.env.example` como `frontend/.env` (el valor por defecto ya apunta al backend
local). Después:

```bash
pnpm dev
```

La aplicación queda en `http://localhost:5173`. `pnpm build` compila y verifica los tipos.

## Usuarios del seed

`python -m app.db.seed` es idempotente: se puede correr las veces que haga falta y solo inserta lo
que todavía no está. Crea estos usuarios, cuatro categorías y ocho productos con stock.

| Usuario | Contraseña | Rol | Para qué sirve |
|---|---|---|---|
| `admin` | `Admin1234!` | admin | Panel de administración completo |
| `cliente` | `Cliente1234!` | user | Probar la compra sin registrarse |

Cualquiera puede registrarse desde `/register`; el registro público siempre crea usuarios con rol
`user`. El `admin` sale únicamente del seed.

## Variables de entorno

### `backend/.env`

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Conexión a la base | `postgresql+psycopg2://foodstore:foodstore@localhost:5432/foodstore_db` |
| `SECRET_KEY` | Firma del JWT, mínimo 32 caracteres | generar con el comando de arriba |
| `ALGORITHM` | Algoritmo del JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Vencimiento de la cookie y del token | `30` |
| `FRONTEND_ORIGIN` | Origen habilitado en CORS, exacto y sin barra final | `http://localhost:5173` |

### `frontend/.env`

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base de la API, con el prefijo `/api/v1` | `http://localhost:8000/api/v1` |

Ninguno de los dos `.env` se versiona. Los `.env.example` sí, y están completos.

## Arquitectura

### Backend: capas por módulo

Cada dominio de `app/modules/` repite la misma cadena, y las dependencias van en una sola
dirección: ninguna capa importa de la de arriba.

```
Router  →  Service  →  Unit of Work  →  Repository  →  Model
```

| Capa | Responsabilidad |
|---|---|
| `router.py` | HTTP: valida el cuerpo con los schemas, resuelve sesión y rol con `Depends`, delega al Service y traduce las excepciones de dominio a `HTTPException` |
| `service.py` | Reglas de negocio. Abre `with self.uow as uow:` y devuelve el schema de salida dentro del bloque |
| `unit_of_work.py` | Crea la sesión y expone los repositorios que la comparten |
| `repository.py` | Consultas con `select`. Hereda de `BaseRepository[T]`, sin reglas de negocio |
| `models.py` | Tablas SQLModel (`table=True`) y relaciones |
| `schemas.py` | Modelos de entrada y salida (SQLModel sin `table=True`) |

**El commit ocurre en un solo lugar: el `__exit__` del Unit of Work.** Ningún Service ni Router
llama a `session.commit()`. El Router obtiene el Service con `Depends(get_<modulo>_service)` y nunca
abre el Unit of Work. Esto es lo que hace que una regla que falla a mitad de camino no deje nada a
medio escribir.

```
backend/app/
├── main.py                    FastAPI, CORS con credenciales, routers bajo /api/v1
├── core/
│   ├── config.py              Settings con pydantic-settings
│   ├── database.py            engine, create_all_tables, session_factory
│   ├── security.py            bcrypt, create_access_token, decode_access_token
│   ├── deps.py                get_current_user, get_current_active_user, require_role
│   ├── unit_of_work.py        UnitOfWork base: commit, rollback y close en __exit__
│   └── base_repository.py     BaseRepository[T]
├── modules/
│   ├── auth/                  registro, login, logout y /me
│   ├── usuarios/              modelo Usuario; listado, activación y desactivación
│   ├── categorias/            CRUD con baja lógica y nombre único
│   ├── productos/             CRUD, stock, baja lógica, listado paginado con búsqueda
│   └── pedidos/               creación transaccional, máquina de estados, resumen
└── db/
    ├── models.py              reúne los modelos para create_all
    └── seed.py                admin, categorías y productos; idempotente
```

### Frontend: módulos por feature

Cada dominio agrupa sus páginas, componentes, hooks, acceso a la API y tipos en una carpeta propia,
y expone su API pública por un barrel (`index.ts`). Desde afuera se importa del barrel, nunca de las
subcarpetas: `import { CatalogoPage } from "@/features/productos"`.

```
frontend/src/
├── shared/                    transversal, sin lógica de negocio
│   ├── api/                   axiosInstance, handleApiError, queryClient, setupInterceptors
│   ├── ui/                    Button, Card, Input, Modal, BadgeEstado
│   ├── components/            Skeleton, EstadoVacio, EstadoError, Paginacion
│   └── layout/                Navbar, MainLayout
├── features/
│   ├── auth/                  LoginPage, RegisterPage, UnauthorizedPage
│   ├── categorias/            AdminCategoriasPage, useCategorias
│   ├── productos/             CatalogoPage, AdminProductosPage, ProductoCard, useProductos
│   ├── usuarios/              AdminUsuariosPage, useUsuarios
│   └── pedidos/               CarritoPage, CheckoutPage, MisPedidosPage,
│                              AdminPedidosPage, AdminResumenPage y sus hooks
├── store/
│   ├── authStore.ts           sesión: usuario, cargando, login, logout, checkSession
│   └── cartStore.ts           carrito: items, agregar, quitar, cambiarCantidad, vaciar, total
├── routes/
│   ├── AppRouter.tsx          tabla de rutas
│   └── ProtectedRoute.tsx     valida sesión y rol
├── App.tsx                    checkSession al montar y monta el router
└── main.tsx                   QueryClientProvider, BrowserRouter, interceptores
```

El alias `@/` apunta a `src/` y está declarado en `vite.config.ts` y en `tsconfig.app.json`; las dos
definiciones tienen que coincidir.

**Separación del estado.** TanStack Query maneja el estado del servidor (catálogo, pedidos,
usuarios, resumen) con invalidación en cada mutación. Zustand maneja el estado del cliente: la
sesión y el carrito, los dos con `persist`. Ningún componente pide datos con `fetch` dentro de un
`useEffect`: la única llamada en `useEffect` es `checkSession` al montar la aplicación.

## Reglas de negocio

| | Regla |
|---|---|
| RN-01 | **Crear pedido.** Al menos un ítem y ningún producto repetido. Cada producto tiene que existir, estar activo y disponible y tener stock suficiente. Por cada ítem se verifica el stock, se descuenta y se crea la línea copiando nombre y precio. Todo en una sola transacción: si una validación falla, no se persiste nada, tampoco el stock ya descontado de las líneas anteriores. |
| RN-02 | **Transiciones.** Solo las de la máquina de estados; un estado terminal no admite cambios. Una transición inválida responde 400. |
| RN-03 | **Cancelar.** Restituye el stock de cada línea en la misma transacción que cambia el estado. |
| RN-04 | **Permisos.** El cliente solo ve y cancela sus propios pedidos, y solo desde `PENDIENTE`. El admin ve todos y puede avanzar o cancelar desde cualquier estado no terminal. |
| RN-05 | **Inmutabilidad.** Las líneas y el total no cambian después de creado el pedido: la línea guarda una copia del nombre y del precio, así que cambiar el producto más tarde no altera lo ya vendido. No hay endpoint de edición ni de borrado de pedidos. |
| RN-06 | **Datos del pedido.** `forma_pago` es `EFECTIVO` o `TRANSFERENCIA` y `direccion_entrega` tiene entre 5 y 200 caracteres. Se validan en el schema. |

### Máquina de estados

```
PENDIENTE ──────► EN_PREPARACION ──────► ENTREGADO
    │                    │
    └──────► CANCELADO ◄─┘
```

`ENTREGADO` y `CANCELADO` son terminales. El mapa de transiciones vive en el Service de pedidos
como un diccionario y se valida antes de tocar el pedido.

## Sesión y permisos

El login (`POST /api/v1/auth/token`, formulario OAuth2) responde con la cookie **HttpOnly**
`access_token`; el token no viaja en el cuerpo y el frontend nunca lo lee ni lo guarda. Axios manda
la cookie en cada petición gracias a `withCredentials: true`, y CORS está configurado con
`allow_credentials` y el origen exacto del frontend (con credenciales el navegador no acepta `*`).

| Código | Cuándo |
|---|---|
| 401 | Falta la cookie, o el token es inválido o venció |
| 400 | La cuenta está desactivada, aunque la cookie siga siendo válida |
| 403 | La sesión es válida pero el rol no alcanza |
| 404 | El recurso no existe, o fue dado de baja lógicamente |
| 409 | Nombre de categoría, username o email ya registrados |
| 422 | El cuerpo o los parámetros no pasan la validación del schema |

En el frontend, un 401 limpia la sesión y `ProtectedRoute` lleva al login. Un 403 no cierra la
sesión: solo informa que falta permiso.

`ProtectedRoute` ordena la navegación, no es la seguridad del sistema: **quien decide es el
backend**. Ocultar un botón de admin no reemplaza a `require_role`, y la API responde 403 igual si
alguien llama al endpoint por fuera de la interfaz.

## Rutas de la aplicación

| Ruta | Acceso | Pantalla |
|---|---|---|
| `/` | público | Catálogo paginado con búsqueda y filtro por categoría |
| `/login`, `/register` | público | Ingreso y registro |
| `/carrito` | público | Carrito, persiste al recargar |
| `/unauthorized` | público | Acceso denegado |
| `/checkout` | con sesión | Confirmar el pedido |
| `/mis-pedidos` | con sesión | Pedidos propios, con detalle y cancelación |
| `/admin/resumen` | admin | Indicadores del negocio |
| `/admin/categorias` | admin | ABM de categorías |
| `/admin/productos` | admin | ABM de productos, stock y disponibilidad |
| `/admin/pedidos` | admin | Pedidos con filtro por estado y cambio de estado |
| `/admin/usuarios` | admin | Activar y desactivar usuarios |

## API

Todos los endpoints van bajo `/api/v1`. Los listados paginados reciben `skip` y `limit` (0 y 20 por
defecto, 100 como máximo) y devuelven `{ "total": N, "items": [...] }`. Los listados públicos
devuelven solo registros activos, y un registro dado de baja se trata como inexistente: su detalle,
`PUT`, `PATCH` y `DELETE` responden 404.

| Método | Endpoint | Acceso |
|---|---|---|
| `POST` | `/auth/register` | público |
| `POST` | `/auth/token` | público |
| `POST` | `/auth/logout` | público |
| `GET` | `/auth/me` | con sesión |
| `GET` | `/admin/usuarios` | admin |
| `POST` | `/admin/usuarios/{id}/activar`, `/desactivar` | admin |
| `GET` | `/categorias`, `/categorias/{id}` | público |
| `POST` `PUT` `DELETE` | `/categorias`, `/categorias/{id}` | admin |
| `GET` | `/productos`, `/productos/{id}` | público |
| `POST` `PUT` `DELETE` | `/productos`, `/productos/{id}` | admin |
| `PATCH` | `/productos/{id}/stock` | admin |
| `POST` | `/pedidos` | con sesión |
| `GET` | `/pedidos`, `/pedidos/{id}` | con sesión (dueño o admin) |
| `GET` | `/pedidos/resumen` | admin |
| `PATCH` | `/pedidos/{id}/estado` | admin |
| `PATCH` | `/pedidos/{id}/cancelar` | dueño |

La referencia completa, con los schemas de entrada y salida de cada endpoint, está en
[`/docs`](http://localhost:8000/docs) con la API levantada.

## Verificación

`backend/check_api.py` recorre el flujo completo contra una base SQLite temporal y comprueba con
asserts las seis reglas de negocio, los códigos de error y los permisos por rol. No necesita que la
API esté levantada ni toca la base de desarrollo:

```bash
cd backend
python check_api.py
```
