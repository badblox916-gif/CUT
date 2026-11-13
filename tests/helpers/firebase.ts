import { expect, type Page } from "@playwright/test";

export const TEST_EMAIL = "owner@example.test";
export const TEST_PASSWORD = "correct-test-password";
export const SESSION_KEY = "firebase:authUser:test-api-key:[DEFAULT]";
export const TEST_PROFILE = { name: "Mi cuenta", handle: "mi.cuenta", bio: "" };
export const SECOND_PROFILE = {
  name: "Otra cuenta",
  handle: "otra.cuenta",
  bio: "",
};

// Real SDK + local emulators. Never read or write the production project.
export async function mockFirebase(page: Page) {
  for (const url of [
    "http://127.0.0.1:8080/emulator/v1/projects/demo-cut/databases/(default)/documents",
    "http://127.0.0.1:9099/emulator/v1/projects/demo-cut/accounts",
  ]) {
    const response = await page.request.delete(url);
    expect(response.ok()).toBe(true);
  }
  for (const email of [TEST_EMAIL, "second@example.test"]) {
    const response = await page.request.post(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-api-key",
      {
        data: { email, password: TEST_PASSWORD, returnSecureToken: true },
      },
    );
    expect(response.ok()).toBe(true);
  }
  const state = { signUps: 0, signIns: 0, rejectUser: false };
  await page.route("http://127.0.0.1:9099/**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const path = new URL(request.url()).pathname;
      if (path.endsWith("accounts:signUp")) state.signUps += 1;
      if (path.endsWith("accounts:signInWithPassword")) state.signIns += 1;
      if (state.rejectUser && path.endsWith("accounts:lookup"))
        return route.fulfill({
          status: 400,
          json: { error: { message: "USER_NOT_FOUND" } },
        });
    }
    return route.continue();
  });
  return state;
}

export async function completeProfile(page: Page, profile = TEST_PROFILE) {
  await page.getByLabel("Nombre", { exact: true }).fill(profile.name);
  await page.getByLabel("Usuario", { exact: true }).fill(profile.handle);
  await page.getByLabel("Biografía", { exact: true }).fill(profile.bio);
  await page
    .getByRole("button", { name: "GUARDAR Y ENTRAR", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("CORTES FRESCOS", { exact: true })).toBeVisible();
}

export async function signIn(page: Page, email = TEST_EMAIL, customize = true) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Correo electrónico", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(TEST_PASSWORD);
  await page
    .getByRole("button", { name: "INICIAR SESIÓN", exact: true })
    .click();
  await expect(page).toHaveURL(/\/(?:complete-profile)?$/);
  await expect(
    page
      .getByText("CORTES FRESCOS", { exact: true })
      .or(page.getByRole("button", { name: "GUARDAR Y ENTRAR", exact: true })),
  ).toBeVisible();
  if (customize) {
    if (page.url().endsWith("/complete-profile"))
      await completeProfile(
        page,
        email === TEST_EMAIL ? TEST_PROFILE : SECOND_PROFILE,
      );
    await expect(
      page.getByText("CORTES FRESCOS", { exact: true }),
    ).toBeVisible();
  }
}

export async function signOut(page: Page) {
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "CERRAR SESIÓN", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sign-in$/);
}
