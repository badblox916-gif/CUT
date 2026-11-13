import { expect, test, type Page } from "@playwright/test";
import { mockFirebase, SESSION_KEY, signIn } from "./helpers/firebase";

async function create(
  page: Page,
  kind: "post" | "story" | "reel",
  text: string,
) {
  await page.goto(`/compose?type=${kind}`);
  if (kind !== "post") {
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByLabel(
        kind === "story" ? "Seleccionar foto o video" : "Seleccionar video",
        { exact: true },
      )
      .click();
    await (
      await chooser
    ).setFiles(
      kind === "story"
        ? "tests/fixtures/photo.jpg"
        : "tests/fixtures/video.mp4",
    );
  }
  await page
    .getByLabel(
      kind === "story"
        ? "Contenido de la historia"
        : "Contenido de la publicación",
      { exact: true },
    )
    .fill(text);
  await page
    .getByRole("button", {
      name: kind === "story" ? "PUBLICAR HISTORIA" : "PUBLICAR CORTE",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(kind === "reel" ? /\/reels$/ : "/");
}

async function confirmDelete(
  page: Page,
  kind: "PUBLICACIÓN" | "REEL" | "HISTORIA",
) {
  await page
    .getByRole("button", { name: `ELIMINAR ${kind}`, exact: true })
    .click();
  await expect(
    page.getByText(`¿ELIMINAR ${kind}?`, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "SÍ, ELIMINAR", exact: true }).click();
}

test("deleting a post requires confirmation, removes it for other accounts and invalidates its direct link", async ({
  page,
  browser,
}) => {
  await mockFirebase(page);
  await signIn(page);
  await create(page, "post", "Un corte que voy a borrar");
  await expect(
    page.getByRole("button", { name: "REINTENTAR CONEXIÓN", exact: true }),
  ).toHaveCount(0);
  const context = await browser.newContext({
    baseURL: "http://localhost:8082",
  });
  const other = await context.newPage();
  try {
    await signIn(other, "second@example.test");
    await expect(
      other.getByText("Un corte que voy a borrar", { exact: true }),
    ).toBeVisible();
    await other.getByLabel("Opciones de publicación", { exact: true }).click();
    await expect(
      other.getByRole("button", { name: "ELIMINAR PUBLICACIÓN", exact: true }),
    ).toHaveCount(0);
    await other.getByRole("button", { name: "LISTO", exact: true }).click();
    await other.getByLabel("Guardar", { exact: true }).click();
    await other.getByLabel("Comentarios", { exact: true }).click();
    await expect(other).toHaveURL(/\/post\//);
    const url = other.url();
    await page.getByLabel("Opciones de publicación", { exact: true }).click();
    await page
      .getByRole("button", { name: "ELIMINAR PUBLICACIÓN", exact: true })
      .click();
    await page.getByRole("button", { name: "CANCELAR", exact: true }).click();
    await expect(
      other.getByText("Un corte que voy a borrar", { exact: true }).last(),
    ).toBeVisible();
    await page.getByLabel("Opciones de publicación", { exact: true }).click();
    await page.screenshot({
      path: "test-results/delete-post-menu.png",
      animations: "disabled",
    });
    await confirmDelete(page, "PUBLICACIÓN");
    await expect(page.getByText("0 CORTES", { exact: true })).toBeVisible();
    await expect(
      other.getByText("CORTE NO ENCONTRADO", { exact: true }),
    ).toBeVisible();
    await other.goto(url);
    await expect(
      other.getByText("CORTE NO ENCONTRADO", { exact: true }),
    ).toBeVisible();
    await other.goto("/profile");
    await other.getByText("GUARDADOS", { exact: true }).last().click();
    await expect(
      other.getByText("TUS INSPIRACIONES, A MANO", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText("0 CORTES", { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("deleting the selected story shows the next story and removes the last story for followers", async ({
  page,
  browser,
}) => {
  await mockFirebase(page);
  await signIn(page);
  await create(page, "story", "Historia anterior");
  await create(page, "story", "Historia nueva");
  const id = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "{}").uid as string,
    SESSION_KEY,
  );
  const context = await browser.newContext({
    baseURL: "http://localhost:8082",
  });
  const other = await context.newPage();
  try {
    await signIn(other, "second@example.test");
    await other.goto(`/creator/${id}`);
    await other.getByRole("button", { name: "SEGUIR", exact: true }).click();
    await expect(
      other.getByRole("button", { name: "SIGUIENDO", exact: true }),
    ).toBeVisible();
    await other.goto(`/story?id=${id}`);
    await expect(
      other.getByText("Historia anterior", { exact: true }),
    ).toBeVisible();
    await expect(
      other.getByLabel("Opciones de historia", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Ver mi historia", exact: true })
      .click();
    await page.getByLabel("Opciones de historia", { exact: true }).click();
    await confirmDelete(page, "HISTORIA");
    await expect(
      page.getByText("Historia nueva", { exact: true }),
    ).toBeVisible();
    await expect(
      other.getByText("Historia nueva", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Opciones de historia", { exact: true }).click();
    await confirmDelete(page, "HISTORIA");
    await expect(
      page.getByText("SIN HISTORIAS", { exact: true }),
    ).toBeVisible();
    await expect(
      other.getByText("SIN HISTORIAS", { exact: true }),
    ).toBeVisible();
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Crear historia", exact: true }),
    ).toBeVisible();
    await other.goto("/");
    await expect(
      other.getByRole("button", { name: /^Ver historias de/ }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("reel options pause playback and deleting removes it from reels and the profile", async ({
  page,
}) => {
  await mockFirebase(page);
  await signIn(page);
  await create(page, "reel", "Reel que voy a borrar");
  const video = page.locator("video").first();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0);
  await page.getByLabel("Opciones de reel", { exact: true }).click();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(true);
  await page
    .getByRole("button", { name: "ELIMINAR REEL", exact: true })
    .click();
  await page.getByRole("button", { name: "CANCELAR", exact: true }).click();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(false);
  await page.getByLabel("Opciones de reel", { exact: true }).click();
  await confirmDelete(page, "REEL");
  await expect(
    page.getByText("AÚN NO HAY REELS", { exact: true }),
  ).toBeVisible();
  await page.goto("/profile");
  await expect(
    page.getByRole("button", {
      name: "Ver reel Reel que voy a borrar",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.goto("/reels");
  await expect(
    page.getByText("AÚN NO HAY REELS", { exact: true }),
  ).toBeVisible();
});
