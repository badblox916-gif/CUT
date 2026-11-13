import { expect, test } from "@playwright/test";
import { mockFirebase, SESSION_KEY, signIn } from "./helpers/firebase";

test("search finds a registered user without posts and outside the recent profile directory", async ({
  page,
  browser,
}) => {
  await mockFirebase(page);
  await signIn(page);
  const context = await browser.newContext({
    baseURL: "http://localhost:8082",
  });
  const other = await context.newPage();
  try {
    await signIn(other, "second@example.test");
    const otherId = await other.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "{}").uid as string,
      SESSION_KEY,
    );
    const response = await page.request.post(
      "http://127.0.0.1:8080/v1/projects/demo-cut/databases/(default)/documents:commit",
      {
        headers: { Authorization: "Bearer owner" },
        data: {
          writes: Array.from({ length: 105 }, (_, index) => ({
            update: {
              name: `projects/demo-cut/databases/(default)/documents/profiles/fixture-${String(index).padStart(3, "0")}`,
              fields: {
                name: { stringValue: `Perfil de prueba ${index}` },
                handle: { stringValue: `prueba.${index}` },
                bio: { stringValue: "" },
                updatedAt: {
                  timestampValue: new Date(Date.now() + 1000).toISOString(),
                },
              },
            },
          })),
        },
      },
    );
    expect(response.ok()).toBe(true);
    await page.reload();
    await page.getByLabel("Buscar cortes", { exact: true }).fill("ÓTRA CUENTA");
    await expect(
      page.getByRole("button", {
        name: "Ver perfil de Otra cuenta",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ver perfil de Otra cuenta", exact: true })
      .click();
    await expect(page).toHaveURL(`/creator/${otherId}`);
    await expect(
      page.getByText("@otra.cuenta", { exact: true }).last(),
    ).toBeVisible();
    await page.goto("/");
    await page
      .getByLabel("Buscar cortes", { exact: true })
      .fill("@OTRA.CUENTA");
    await expect(
      page.getByRole("button", {
        name: "Ver perfil de Otra cuenta",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({ path: "test-results/search-users.png" });
    await page
      .getByRole("button", { name: "SEGUIR", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "SIGUIENDO", exact: true }),
    ).toHaveCount(2);
    await page
      .getByLabel("Buscar cortes", { exact: true })
      .fill("no-existe-ese-nombre");
    await expect(
      page.getByText("No encontramos usuarios con ese nombre o @usuario.", {
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Limpiar búsqueda", exact: true })
      .click();
    await expect(page.getByText("PERSONAS", { exact: true })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("new interactions arrive in another account, open their target and stay read after reload", async ({
  page,
  browser,
}) => {
  await mockFirebase(page);
  await signIn(page);
  await page.goto("/compose");
  await page
    .getByLabel("Contenido de la publicación", { exact: true })
    .fill("Un corte para recibir actividad");
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  const context = await browser.newContext({
    baseURL: "http://localhost:8082",
  });
  const other = await context.newPage();
  try {
    await signIn(other, "second@example.test");
    await other.getByRole("button", { name: "Me gusta", exact: true }).click();
    await expect(
      other.getByRole("button", { name: "Me gusta", exact: true }),
    ).toContainText("1");
    await other.getByRole("button", { name: "Repostear", exact: true }).click();
    await other
      .getByRole("button", { name: "Ver perfil de Mi cuenta", exact: true })
      .click();
    await other.getByRole("button", { name: "SEGUIR", exact: true }).click();
    await expect(
      other.getByRole("button", { name: "SIGUIENDO", exact: true }),
    ).toBeVisible();
    await other
      .getByRole("button", { name: "Comentarios", exact: true })
      .click();
    await other
      .getByLabel("Escribir comentario", { exact: true })
      .fill("Un comentario desde mi cuenta");
    await other.getByRole("button", { name: "ENVIAR", exact: true }).click();
    await expect(
      other.getByText("Un comentario desde mi cuenta", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Hay notificaciones sin leer", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Notificaciones", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Otra cuenta comenzó a seguirte",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Otra cuenta le dio me gusta a tu publicación",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Otra cuenta reposteó tu publicación",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Otra cuenta comentó tu publicación",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({ path: "test-results/notifications-populated.png" });
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: "Otra cuenta comentó tu publicación",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Otra cuenta comentó tu publicación",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Un comentario desde mi cuenta", { exact: true }),
    ).toBeVisible();
    await page.goto("/");
    await expect(
      page.getByLabel("Hay notificaciones sin leer", { exact: true }),
    ).toHaveCount(0);
    await other.goto("/notifications");
    await expect(
      other.getByText("SIN NOTIFICACIONES", { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
