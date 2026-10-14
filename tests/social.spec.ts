import { test, expect } from "@playwright/test";

test("feed mobile, search and navigation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("CORTES FRESCOS", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar cortes" })
    .fill("SneakerCulture");
  await expect(page.getByText("1 CORTES", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Un clásico que nunca se queda quieto.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  await expect(page.getByText("4 CORTES", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/feed-mobile.png" });
  await page.getByRole("tab", { name: /Perfil/i }).click();
  await expect(page.getByText("Alex Morgan", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("publish, comment and saved post persist after reload", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Crear publicación", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Contenido de la publicación" })
    .fill("Mi primer corte de prueba #MiEstilo");
  await page.getByRole("button", { name: "PUBLICAR CORTE" }).click();
  await expect(
    page.getByText("Mi primer corte de prueba #MiEstilo", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Guardar", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Comentarios", exact: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Escribir comentario" })
    .fill("Una idea que merece un corte.");
  await page.getByRole("button", { name: "ENVIAR" }).click();
  await expect(
    page.getByText("Una idea que merece un corte.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Una idea que merece un corte.", { exact: true }),
  ).toBeVisible();
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.getByText("GUARDADOS", { exact: true }).last().click();
  await expect(
    page.getByText("Mi primer corte de prueba #MiEstilo", { exact: true }),
  ).toBeVisible();
});

test("poll votes once and persists", async ({ page }) => {
  await page.goto("/post/poll", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Votar por COLLAGE ANALÓGICO" })
    .click();
  await expect(
    page.getByText("VOTO REGISTRADO ✓", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Votar por TIPOGRAFÍA EXPERIMENTAL" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByText("VOTO REGISTRADO ✓", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("101 votos", { exact: false })).toBeVisible();
});

test("edit profile and validate handle", async ({ page }) => {
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "EDITAR PERFIL" }).click();
  await page.getByRole("textbox", { name: "Usuario", exact: true }).fill("!");
  await page.getByRole("button", { name: "GUARDAR CAMBIOS" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Usuario", exact: true })
    .fill("alex.cut");
  await page
    .getByRole("textbox", { name: "Nombre", exact: true })
    .fill("Alex Creativo");
  await page.getByRole("button", { name: "GUARDAR CAMBIOS" }).click();
  await expect(page.getByText("Alex Creativo", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("@alex.cut", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/profile-mobile.png" });
});

test("reel playback pauses and stops when leaving the tab", async ({
  page,
}) => {
  await page.goto("/reels", { waitUntil: "domcontentloaded" });
  const video = page.locator("video");
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0);
  await page.getByLabel("Pausar reel", { exact: true }).click();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(true);
  await page.screenshot({ path: "test-results/reels-mobile.png" });
  await page.getByRole("tab", { name: /Inicio/i }).click();
  await expect(page.getByText("CORTES FRESCOS", { exact: true })).toBeVisible();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(true);
});

test("photo upload survives reload", async ({ page }) => {
  await page.goto("/compose", { waitUntil: "domcontentloaded" });
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByLabel("Añadir foto", { exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles("assets/media/sneakers.jpg");
  await page
    .getByRole("textbox", { name: "Contenido de la publicación" })
    .fill("Mi foto local #MiCorte");
  await page.getByRole("button", { name: "PUBLICAR CORTE" }).click();
  await expect(
    page.getByText("Mi foto local #MiCorte", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Mi foto local #MiCorte", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('img[src^="blob:"]').first()).toBeVisible();
});

test("narrow mobile and desktop layouts stay inside the viewport", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 700 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("CORTES FRESCOS", { exact: true }),
    ).toBeVisible();
    for (const label of ["Notificaciones", "Mi perfil", "Crear publicación"]) {
      const box = await page.getByLabel(label, { exact: true }).boundingBox();
      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
        viewport.width,
      );
    }
    const search = await page
      .getByRole("textbox", { name: "Buscar cortes" })
      .boundingBox();
    expect(search?.width).toBeLessThanOrEqual(560);
    await expect
      .poll(() =>
        page
          .locator("img")
          .evaluateAll(
            (images) =>
              images.filter(
                (image) => (image as HTMLImageElement).naturalWidth > 0,
              ).length >= 2,
          ),
      )
      .toBe(true);
    await page.screenshot({
      path: "test-results/feed-" + viewport.width + ".png",
      animations: "disabled",
    });
    if (viewport.width === 320) {
      await page
        .getByLabel("Ver publicación y comentarios", { exact: true })
        .first()
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: "test-results/feed-content-mobile.png",
        animations: "disabled",
      });
    }
  }
});

test("creator stories, following and notifications navigate correctly", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Ver corte de Valeria Ríos", { exact: true }).click();
  await expect(
    page.getByText("SIN FILTRO. CON ACTITUD.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "VER CREADOR" }).click();
  await expect(
    page
      .getByText("Valeria Ríos", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "SIGUIENDO", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "SEGUIR", exact: true }),
  ).toBeVisible();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Notificaciones", { exact: true }).click();
  await expect(page.getByText("ALGO SE MUEVE.", { exact: true })).toBeVisible();
});

test("uploaded reel persists and can be opened from saved posts", async ({
  page,
}) => {
  await page.goto("/compose?type=reel", { waitUntil: "domcontentloaded" });
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByLabel("Seleccionar video", { exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles("assets/media/reel.mp4");
  await page
    .getByRole("textbox", { name: "Contenido de la publicación" })
    .fill("Mi sesión de lluvia #MiReel");
  await page.getByRole("button", { name: "PUBLICAR CORTE" }).click();
  await expect(
    page
      .getByText("Mi sesión de lluvia #MiReel", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByLabel("Guardar reel", { exact: true }).first().click();
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.getByText("GUARDADOS", { exact: true }).last().click();
  await page.getByText("Mi sesión de lluvia #MiReel", { exact: true }).click();
  await expect(page).toHaveURL(/\/reels\?id=/);
  await expect(
    page
      .getByText("Mi sesión de lluvia #MiReel", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page.reload();
  const video = page.locator("video").first();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0);
});
