import { test, expect } from "@playwright/test";
import {
  mockFirebase,
  signIn,
  signOut,
  TEST_EMAIL,
  TEST_PASSWORD,
  SESSION_KEY,
  completeProfile,
} from "./helpers/firebase";

test("protects every private route while signed out", async ({ page }) => {
  await mockFirebase(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/",
    "/profile",
    "/reels",
    "/compose",
    "/edit-profile",
    "/complete-profile",
    "/settings",
    "/notifications",
    "/story?id=vale",
    "/post/street",
    "/creator/vale",
    "/connections?id=vale&type=followers",
  ]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(
      page.getByRole("tab", { name: "Iniciar sesión", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Registrarme", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Crear publicación", { exact: true }),
    ).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("validates registration before sending and clears passwords when switching modes", async ({
  page,
}) => {
  const state = await mockFirebase(page);
  await page.goto("/sign-in");
  await page.getByRole("tab", { name: "Registrarme", exact: true }).click();
  const submit = page.getByRole("button", {
    name: "CREAR CUENTA",
    exact: true,
  });
  await submit.click();
  await expect(page.getByRole("alert")).toHaveText(
    "Escribe un correo electrónico válido.",
  );
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("new@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("123");
  await submit.click();
  await expect(page.getByRole("alert")).toHaveText(
    "La contraseña debe tener al menos 6 caracteres.",
  );
  await page.getByLabel("Contraseña", { exact: true }).fill(TEST_PASSWORD);
  await page
    .getByLabel("Confirmar contraseña", { exact: true })
    .fill("different-password");
  await submit.click();
  await expect(page.getByRole("alert")).toHaveText(
    "Las contraseñas no coinciden.",
  );
  expect(state.signUps).toBe(0);
  await page.getByRole("tab", { name: "Iniciar sesión", exact: true }).click();
  await expect(
    page.getByLabel("Correo electrónico", { exact: true }),
  ).toHaveValue("new@example.test");
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("tab", { name: "Registrarme", exact: true }).click();
  await expect(
    page.getByLabel("Confirmar contraseña", { exact: true }),
  ).toHaveValue("");
});

test("creates an account, customizes its profile before entering and keeps photos after reload", async ({
  page,
}) => {
  const state = await mockFirebase(page);
  await page.goto("/sign-in");
  await page.getByRole("tab", { name: "Registrarme", exact: true }).click();
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("new@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill(TEST_PASSWORD);
  await page
    .getByLabel("Confirmar contraseña", { exact: true })
    .fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "CREAR CUENTA", exact: true }).click();
  await expect(page).toHaveURL(/\/complete-profile$/);
  await expect(page.getByRole("tab", { name: /Inicio/i })).toHaveCount(0);
  await page
    .getByRole("button", { name: "GUARDAR Y ENTRAR", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Tu nombre no puede estar vacío.",
  );
  await page.getByLabel("Nombre", { exact: true }).fill("Mi nombre nuevo");
  await page.getByLabel("Usuario", { exact: true }).fill("!");
  await page
    .getByRole("button", { name: "GUARDAR Y ENTRAR", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("entre 3 y 24");
  for (const path of ["/", "/profile", "/compose", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/complete-profile$/);
  }
  await page.setViewportSize({ width: 320, height: 740 });
  for (const button of ["AÑADIR FOTO", "AÑADIR PORTADA"]) {
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: button, exact: true }).click();
    await (await chooser).setFiles("tests/fixtures/photo.jpg");
    await expect(
      page.getByText("Preparando imagen…", { exact: true }),
    ).toHaveCount(0);
  }
  await expect(
    page.getByRole("img", { name: "Portada del perfil", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/profile-setup-mobile.png",
    fullPage: true,
  });
  await completeProfile(page, {
    name: "Mi nombre nuevo",
    handle: "nueva.cuenta",
    bio: "Mi estilo y mi espacio.",
  });
  await expect(page.getByText("0 CORTES", { exact: true })).toBeVisible();
  expect(state.signUps).toBe(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    TEST_PASSWORD,
  );
  await page.reload();
  await expect(page.getByText("CORTES FRESCOS", { exact: true })).toBeVisible();
  await page.goto("/profile");
  await expect(
    page.getByText("Mi nombre nuevo", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("@nueva.cuenta", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Mi estilo y mi espacio.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('img[src*="127.0.0.1:9199"]')).toHaveCount(3);
  await page
    .getByRole("button", { name: "EDITAR PERFIL", exact: true })
    .click();
  await page.getByRole("button", { name: "QUITAR FOTO", exact: true }).click();
  await page
    .getByRole("button", { name: "QUITAR PORTADA", exact: true })
    .click();
  await page
    .getByRole("button", { name: "GUARDAR CAMBIOS", exact: true })
    .click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.reload();
  await expect(page.getByText("@nueva.cuenta", { exact: true })).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
  await page.goto("/complete-profile");
  await expect(page).toHaveURL("/");
  await signOut(page);
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), SESSION_KEY))
    .toBeNull();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/sign-in$/);
  await signIn(page, "new@example.test");
  expect(state.signIns).toBe(1);
});

test("an unfinished profile resumes after reload and sign-out", async ({
  page,
}) => {
  await mockFirebase(page);
  await signIn(page, TEST_EMAIL, false);
  await expect(page).toHaveURL(/\/complete-profile$/);
  await page.reload();
  await expect(page).toHaveURL(/\/complete-profile$/);
  await page
    .getByRole("button", { name: "CERRAR SESIÓN", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await signIn(page, TEST_EMAIL, false);
  await expect(page).toHaveURL(/\/complete-profile$/);
  await completeProfile(page);
  await page.reload();
  await expect(page.getByText("CORTES FRESCOS", { exact: true })).toBeVisible();
});

test("a duplicate handle stays in setup and permits retry", async ({
  page,
  browser,
}) => {
  await mockFirebase(page);
  await signIn(page);
  const context = await browser.newContext({
    baseURL: "http://localhost:8082",
  });
  const other = await context.newPage();
  await signIn(other, "second@example.test", false);
  await other.getByLabel("Nombre", { exact: true }).fill("Otra persona");
  await other.getByLabel("Usuario", { exact: true }).fill("mi.cuenta");
  await other
    .getByRole("button", { name: "GUARDAR Y ENTRAR", exact: true })
    .click();
  await expect(other.getByRole("alert")).toHaveText(
    "Ese usuario ya está ocupado. Elige otro.",
  );
  await expect(other).toHaveURL(/complete-profile$/);
  await completeProfile(other, {
    name: "Otra persona",
    handle: "otra.persona",
    bio: "",
  });
  await context.close();
});

test("shows duplicate registration and incorrect credential errors", async ({
  page,
}) => {
  await mockFirebase(page);
  await page.goto("/sign-in");
  await page.getByRole("tab", { name: "Registrarme", exact: true }).click();
  await page.getByLabel("Correo electrónico", { exact: true }).fill(TEST_EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill(TEST_PASSWORD);
  await page
    .getByLabel("Confirmar contraseña", { exact: true })
    .fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "CREAR CUENTA", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Ya existe una cuenta con este correo. Inicia sesión.",
  );
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByRole("tab", { name: "Iniciar sesión", exact: true }).click();
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("incorrect-password");
  await page
    .getByRole("button", { name: "INICIAR SESIÓN", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Correo o contraseña incorrectos.",
  );
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("rejects legacy flags and revoked Firebase sessions", async ({ page }) => {
  const state = await mockFirebase(page);
  await page.addInitScript(() => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem(
      "cut-auth-session-v1",
      JSON.stringify({ access_token: "old-session", user: { id: "old-user" } }),
    );
  });
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/sign-in$/);
  await signIn(page);
  state.rejectUser = true;
  await page.reload();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("shares public posts while keeping personal profiles separate", async ({
  page,
}) => {
  await mockFirebase(page);
  await signIn(page);
  await page.goto("/compose");
  await page
    .getByRole("textbox", { name: "Contenido de la publicación" })
    .fill("Publicación de mi primera cuenta");
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByText("Publicación de mi primera cuenta", { exact: true }),
  ).toBeVisible();
  await signOut(page);
  await signIn(page, "second@example.test");
  await expect(page.getByText("1 CORTES", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Publicación de mi primera cuenta", { exact: true }),
  ).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByText("Otra cuenta", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Publicación de mi primera cuenta", { exact: true }),
  ).toHaveCount(0);
  await signOut(page);
  await signIn(page);
  await expect(
    page.getByText("Publicación de mi primera cuenta", { exact: true }),
  ).toBeVisible();
});

test("login and registration fit a narrow phone and can reveal passwords", async ({
  page,
}) => {
  await mockFirebase(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/sign-in");
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveJSProperty(
    "type",
    "password",
  );
  await page.getByLabel("Mostrar contraseña", { exact: true }).click();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveJSProperty(
    "type",
    "text",
  );
  await page.screenshot({
    path: "test-results/sign-in-mobile.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Registrarme", exact: true }).click();
  await expect(
    page.getByLabel("Confirmar contraseña", { exact: true }),
  ).toHaveJSProperty("type", "password");
  await page.getByLabel("Mostrar contraseña", { exact: true }).click();
  await expect(
    page.getByLabel("Confirmar contraseña", { exact: true }),
  ).toHaveJSProperty("type", "text");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "CREAR CUENTA", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/sign-up-mobile.png",
    fullPage: true,
  });
});
