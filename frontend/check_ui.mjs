// Recorre la aplicacion en un navegador real: catalogo, login, carrito,
// checkout y panel de administracion. Deja capturas en ./capturas.
// Requiere el backend en :8000 y `pnpm dev` en :5173.
//
//   node check_ui.mjs

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:5173";
const SALIDA = "capturas";
mkdirSync(SALIDA, { recursive: true });

let ok = 0;
const fallos = [];
const erroresConsola = [];

function check(condicion, descripcion) {
  if (condicion) {
    ok++;
    console.log(`  ok  ${descripcion}`);
  } else {
    fallos.push(descripcion);
    console.log(`  FALLO  ${descripcion}`);
  }
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
const page = await contexto.newPage();

page.on("console", (m) => {
  if (m.type() === "error") erroresConsola.push(m.text());
});
page.on("pageerror", (e) => erroresConsola.push(`pageerror: ${e.message}`));

async function captura(nombre) {
  await page.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: true });
}

try {
  console.log("1. Catalogo publico");
  await page.goto(BASE, { waitUntil: "networkidle" });
  const tarjetas = page.locator("article, .grid > div").filter({ hasText: "$" });
  await page.waitForTimeout(800);
  const cuantas = await tarjetas.count();
  check(cuantas > 0, `se ven ${cuantas} productos en el catalogo`);
  check(await page.getByText("Food Store").first().isVisible(), "la navbar se renderiza");
  await captura("01-catalogo");

  console.log("\n2. Busqueda");
  const buscador = page.getByLabel("Buscar").first();
  await buscador.fill("pizza");
  await page.waitForTimeout(1200); // debounce + request
  const trasBuscar = await tarjetas.count();
  check(trasBuscar > 0 && trasBuscar < cuantas, `la busqueda "pizza" filtro a ${trasBuscar}`);
  await captura("02-busqueda");
  await buscador.fill("");
  await page.waitForTimeout(1200);

  console.log("\n3. Agregar al carrito");
  await page.getByRole("button", { name: /agregar/i }).first().click();
  await page.waitForTimeout(400);
  const badge = await page.locator("header").getByText(/^[1-9]\d*$/).first().isVisible();
  check(badge, "el contador del carrito se actualiza en la navbar");

  await page.getByRole("link", { name: /carrito/i }).first().click();
  await page.waitForURL("**/carrito");
  await page.waitForTimeout(400);
  const totalCarrito = page.getByText("Total", { exact: true }).first();
  check(await totalCarrito.isVisible(), "el carrito muestra el total");
  await captura("03-carrito");

  console.log("\n4. El carrito sobrevive al recargar");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check(
    await page.getByText("Total", { exact: true }).first().isVisible(),
    "sigue habiendo items tras recargar",
  );

  console.log("\n5. Checkout sin sesion manda al login");
  await page.getByRole("button", { name: /continuar|finalizar|checkout/i }).first().click();
  await page.waitForURL("**/login", { timeout: 5000 });
  check(page.url().includes("/login"), "sin sesion redirige a /login");
  await captura("04-login");

  console.log("\n6. Login como cliente");
  await page.getByLabel(/usuario/i).first().fill("cliente");
  await page.getByLabel(/contrase/i).first().fill("Cliente1234!");
  await page.getByRole("button", { name: /ingresar|iniciar/i }).first().click();
  await page.waitForTimeout(1500);
  check(!page.url().includes("/login"), "el login redirige fuera de /login");
  check(await page.getByText(/cerrar sesi/i).first().isVisible(), "aparece 'Cerrar sesión'");

  console.log("\n7. Checkout");
  await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const hayDireccion = await page.getByLabel(/direcci/i).first().isVisible();
  check(hayDireccion, "el formulario de checkout se muestra");
  if (hayDireccion) {
    await page.getByLabel(/direcci/i).first().fill("Av. Corrientes 2500, CABA");
    await page.getByLabel(/efectivo/i).first().check();
    await captura("05-checkout");
    await page.getByRole("button", { name: /confirmar|realizar|enviar/i }).first().click();
    await page.waitForTimeout(3000);
    await captura("06-mis-pedidos");
    const llego = page.url().includes("mis-pedidos");
    check(llego, `tras confirmar va a Mis pedidos (url: ${page.url()})`);

    // el pedido tiene que existir aunque la navegacion haya fallado
    await page.goto(`${BASE}/mis-pedidos`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    check(
      await page.getByText(/pendiente/i).first().isVisible().catch(() => false),
      "el pedido aparece en Mis pedidos como PENDIENTE",
    );
    await captura("06b-mis-pedidos");
  }

  console.log("\n8. Un cliente no entra al panel");
  await page.goto(`${BASE}/admin/productos`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  check(page.url().includes("unauthorized"), "el rol user va a /unauthorized");
  await captura("07-unauthorized");

  console.log("\n9. Panel de administracion");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /cerrar sesi/i }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/usuario/i).first().fill("admin");
  await page.getByLabel(/contrase/i).first().fill("Admin1234!");
  await page.getByRole("button", { name: /ingresar|iniciar/i }).first().click();
  await page.waitForTimeout(1800);

  for (const [ruta, nombre, texto] of [
    ["/admin/resumen", "08-resumen", /pendiente/i],
    ["/admin/productos", "09-productos", /stock/i],
    ["/admin/categorias", "10-categorias", /categor/i],
    ["/admin/pedidos", "11-pedidos", /estado/i],
    ["/admin/usuarios", "12-usuarios", /email/i],
  ]) {
    await page.goto(BASE + ruta, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const visible = await page.getByText(texto).first().isVisible().catch(() => false);
    check(visible && !page.url().includes("unauthorized"), `${ruta} carga para el admin`);
    await captura(nombre);
  }
} catch (e) {
  fallos.push(`excepcion: ${e.message}`);
  console.log(`\n  EXCEPCION  ${e.message}`);
  await captura("99-error");
} finally {
  await navegador.close();
}

console.log(`\n${ok} verificaciones OK`);
if (erroresConsola.length > 0) {
  console.log(`\n${erroresConsola.length} errores de consola:`);
  for (const e of [...new Set(erroresConsola)].slice(0, 10)) console.log(`  - ${e}`);
}
if (fallos.length > 0) {
  console.log(`\n${fallos.length} fallos:`);
  for (const f of fallos) console.log(`  - ${f}`);
  process.exit(1);
}
