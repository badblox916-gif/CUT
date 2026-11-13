import { test, expect, type Page } from "@playwright/test";
import { mockFirebase, signIn, TEST_PROFILE } from "./helpers/firebase";

test.beforeEach(async ({ page }) => {
  await mockFirebase(page);
  await signIn(page);
});

async function publish(page: Page, text: string) {
  await page.goto("/compose", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("textbox", { name: "Contenido de la publicación" })
    .fill(text);
  await page.getByRole("button", { name: "PUBLICAR CORTE" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText(text, { exact: true })).toBeVisible();
}

test("starts empty across feed, reels, profile and notifications", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("0 CORTES", { exact: true })).toBeVisible();
  await expect(
    page.getByText("AÚN NO HAY CORTES", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Las tendencias aparecerán aquí.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("img, video")).toHaveCount(0);
  await page.getByRole("button", { name: "SIGUIENDO", exact: true }).click();
  await expect(page.getByText("0 CORTES", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/feed-empty.png" });

  await page.getByRole("tab", { name: /Reels/i }).click();
  await expect(
    page.getByText("AÚN NO HAY REELS", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);
  await page.screenshot({ path: "test-results/reels-empty.png" });

  await page.getByRole("tab", { name: /Perfil/i }).click();
  await expect(
    page.getByText(TEST_PROFILE.name, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("0", { exact: true })).toHaveCount(3);
  await expect(page.locator("img")).toHaveCount(0);
  await page.screenshot({ path: "test-results/profile-empty.png" });
  await page.getByText("GUARDADOS", { exact: true }).last().click();
  await expect(
    page.getByText("TUS INSPIRACIONES, A MANO", { exact: true }),
  ).toBeVisible();
  await page.getByText("REPOSTS", { exact: true }).click();
  await expect(
    page.getByText("DALE VOZ A OTROS CORTES", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ajustes", { exact: true }).click();
  await expect(
    page.getByText("Aún no sigues a nadie.", { exact: true }),
  ).toBeVisible();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Notificaciones", { exact: true }).click();
  await expect(
    page.getByText("SIN NOTIFICACIONES", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("keeps local prototype content out of the shared feed", async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.setItem(
      "cut-social-v2:old-account",
      JSON.stringify({
        posts: [
          {
            id: "legacy-post",
            text: "Contenido anterior local",
            creatorId: "me",
          },
        ],
        profile: { name: "Perfil anterior", handle: "perfil.anterior" },
      }),
    ),
  );
  await page.reload();
  await expect(
    page.getByText("Contenido anterior local", { exact: true }),
  ).toHaveCount(0);
  await publish(page, "Mi primer corte compartido");
  await page.reload();
  await expect(
    page.getByText("Mi primer corte compartido", { exact: true }),
  ).toBeVisible();
});

test("publish, comment and save persist after reload", async ({ page }) => {
  await publish(page, "Mi primer corte #MiEstilo");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("button", { name: "Comentarios", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Escribir comentario" })
    .fill("Mi comentario.");
  await page.getByRole("button", { name: "ENVIAR" }).click();
  await expect(page.getByText("Mi comentario.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Mi comentario.", { exact: true })).toBeVisible();
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.getByText("GUARDADOS", { exact: true }).last().click();
  await expect(
    page.getByText("Mi primer corte #MiEstilo", { exact: true }),
  ).toBeVisible();
});

test("edit a personalized profile and keep it after reload", async ({
  page,
}) => {
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "EDITAR PERFIL" }).click();
  await expect(
    page.getByRole("textbox", { name: "Nombre", exact: true }),
  ).toHaveValue(TEST_PROFILE.name);
  await expect(
    page.getByRole("textbox", { name: "Usuario", exact: true }),
  ).toHaveValue(TEST_PROFILE.handle);
  await expect(
    page.getByRole("textbox", { name: "Biografía", exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("textbox", { name: "Nombre", exact: true })
    .fill("Mi nombre");
  await page.getByRole("textbox", { name: "Usuario", exact: true }).fill("!");
  await page.getByRole("button", { name: "GUARDAR CAMBIOS" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Usuario", exact: true })
    .fill("mi.usuario");
  await page
    .getByRole("textbox", { name: "Biografía", exact: true })
    .fill("Mi biografía.");
  await page.getByRole("button", { name: "GUARDAR CAMBIOS" }).click();
  await expect(page.getByText("Mi nombre", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("@mi.usuario", { exact: true })).toBeVisible();
  await expect(page.getByText("Mi biografía.", { exact: true })).toBeVisible();
});

test("photo upload survives reload", async ({ page }) => {
  await page.goto("/compose", { waitUntil: "domcontentloaded" });
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByLabel("Añadir foto o video", { exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles("tests/fixtures/photo.jpg");
  await page
    .getByRole("textbox", { name: "Contenido de la publicación" })
    .fill("Mi foto local");
  await page.getByRole("button", { name: "PUBLICAR CORTE" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("Mi foto local", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Mi foto local", { exact: true })).toBeVisible();
  await expect(
    page.locator('img[src*="127.0.0.1:9199"]').first(),
  ).toBeVisible();
});

test("uploaded reel plays, pauses and persists in saved posts", async ({
  page,
}) => {
  await page.goto("/compose?type=reel", { waitUntil: "domcontentloaded" });
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByLabel("Seleccionar video", { exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles("tests/fixtures/video.mp4");
  await page
    .getByRole("textbox", { name: "Contenido de la publicación" })
    .fill("Mi primer reel");
  await page.getByRole("button", { name: "PUBLICAR CORTE" }).click();
  await expect(page).toHaveURL(/\/reels$/);
  const video = page.locator("video").first();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0);
  await page.getByLabel("Pausar reel", { exact: true }).click();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(true);
  await page.getByLabel("Reproducir reel", { exact: true }).click();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(false);
  await page.getByLabel("Guardar reel", { exact: true }).click();
  await page.getByRole("tab", { name: /Inicio/i }).click();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(true);
  await page.getByRole("tab", { name: /Perfil/i }).click();
  await page.getByText("GUARDADOS", { exact: true }).last().click();
  await page
    .getByRole("button", { name: "Ver reel Mi primer reel", exact: true })
    .click();
  await expect(page).toHaveURL(/\/reels\?id=/);
  await page.reload();
  await expect
    .poll(() =>
      page
        .locator("video")
        .first()
        .evaluate((el: HTMLVideoElement) => el.currentTime),
    )
    .toBeGreaterThan(0);
});

test("empty mobile and desktop layouts stay inside the viewport", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 700 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("AÚN NO HAY CORTES", { exact: true }),
    ).toBeVisible();
    for (const label of ["Notificaciones", "Mi perfil", "Crear publicación"]) {
      const box = await page.getByLabel(label, { exact: true }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
    await expect(page.locator("img, video")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: "test-results/feed-empty-" + viewport.width + ".png",
      animations: "disabled",
    });
  }
});

test("old links show empty states without recreating demo content", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [url, title] of [
    ["/story?id=vale", "SIN HISTORIAS"],
    ["/creator/vale", "PERFIL NO ENCONTRADO"],
    ["/post/street", "CORTE NO ENCONTRADO"],
  ]) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.locator("img, video")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
