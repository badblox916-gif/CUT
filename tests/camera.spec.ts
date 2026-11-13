import { expect, test, type Page } from "@playwright/test";
import { mockFirebase, signIn } from "./helpers/firebase";

async function capture(page: Page, kind: "photo" | "video") {
  await page.getByRole("button", { name: "Abrir cámara", exact: true }).click();
  const opened = page.waitForEvent("filechooser");
  await page
    .getByRole("button", {
      name: kind === "photo" ? "TOMAR FOTO" : "GRABAR VIDEO",
      exact: true,
    })
    .click();
  const chooser = await opened;
  expect(await chooser.element().getAttribute("capture")).toBe("environment");
  const accepted = await chooser.element().getAttribute("accept");
  if (kind === "photo") {
    expect(accepted?.split(",").filter(Boolean)).toEqual(["image/*"]);
  } else expect(accepted).toContain("video/");
  await chooser.setFiles(
    kind === "photo" ? "tests/fixtures/photo.jpg" : "tests/fixtures/video.mp4",
  );
}

test.beforeEach(async ({ page }) => {
  await mockFirebase(page);
  await signIn(page);
});

test("a photo capture previews before upload and cancellation preserves both the draft and previous photo", async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes(":9199/") && request.method() === "POST")
      uploads.push(request.url());
  });
  await page.goto("/compose");
  await page
    .getByLabel("Contenido de la publicación", { exact: true })
    .fill("Foto desde la cámara");
  await capture(page, "photo");
  const preview = page.locator('img[src^="blob:"]');
  await expect(preview).toBeVisible();
  const source = await preview.getAttribute("src");
  expect(uploads).toHaveLength(0);
  const canceled = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir cámara", exact: true }).click();
  await page.getByRole("button", { name: "TOMAR FOTO", exact: true }).click();
  await (await canceled).setFiles([]);
  await expect(preview).toHaveAttribute("src", source!);
  await expect(
    page.getByLabel("Contenido de la publicación", { exact: true }),
  ).toHaveValue("Foto desde la cámara");
  await page.screenshot({
    path: "test-results/camera-photo-preview.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByText("Foto desde la cámara", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('img[src*="127.0.0.1:9199"]')).toBeVisible();
  expect(uploads.length).toBeGreaterThan(0);
});

test("a recorded post plays inline in the feed and releases its player when offscreen", async ({
  page,
}) => {
  await page.goto("/compose");
  await page
    .getByLabel("Contenido de la publicación", { exact: true })
    .fill("Video grabado para el inicio");
  await capture(page, "video");
  await expect(page.locator("video")).toBeVisible();
  await page.locator("video").scrollIntoViewIfNeeded();
  await expect(
    page.getByText("Se publicará como video en el inicio", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/camera-video-preview.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("button", {
      name: "Ver video de la publicación",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByTestId("inline-video").scrollIntoViewIfNeeded();
  const video = page.locator("video:visible").first();
  await expect(video).toHaveAttribute("controls", "");
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
  await video.evaluate(async (element: HTMLVideoElement) => {
    element.muted = true;
    await element.play();
  });
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  const playing = await video.elementHandle();
  await page
    .getByLabel("Buscar cortes", { exact: true })
    .scrollIntoViewIfNeeded();
  await expect(page.locator("video")).toHaveCount(0);
  expect(
    await playing!.evaluate((element: HTMLVideoElement) => element.paused),
  ).toBe(true);
  await page.getByTestId("inline-video").scrollIntoViewIfNeeded();
  await expect(video).toBeVisible();
  await page.screenshot({
    path: "test-results/inline-video-feed.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Comentarios", exact: true }).click();
  await expect(page).toHaveURL(/\/post\//);
  await page.reload();
  await expect(
    page.getByText("Video grabado para el inicio", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("video:visible")).toBeVisible();
  await page.goto("/reels");
  await expect(
    page.getByText("AÚN NO HAY REELS", { exact: true }),
  ).toBeVisible();
});

for (const kind of ["photo", "video"] as const) {
  test(`a camera ${kind} becomes a story without creating a feed post`, async ({
    page,
  }) => {
    await page.goto("/compose?type=story");
    await page
      .getByLabel("Contenido de la historia", { exact: true })
      .fill("Mi historia con cámara");
    await capture(page, kind);
    await page
      .getByRole("button", { name: "PUBLICAR HISTORIA", exact: true })
      .click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("0 CORTES", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Ver mi historia", exact: true })
      .click();
    await expect(
      page.getByText("Mi historia con cámara", { exact: true }),
    ).toBeVisible();
    if (kind === "photo")
      await expect(
        page.getByRole("img", { name: "Imagen de la historia", exact: true }),
      ).toBeVisible();
    else
      await expect
        .poll(() =>
          page
            .locator("video:visible")
            .first()
            .evaluate((video: HTMLVideoElement) => video.currentTime),
        )
        .toBeGreaterThan(0);
  });
}

test("the reel editor records video and keeps gallery selection available on narrow phones", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/compose?type=reel");
  await page.getByRole("button", { name: "Abrir cámara", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "TOMAR FOTO", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "GRABAR VIDEO", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "CANCELAR", exact: true }).click();
  const gallery = page.waitForEvent("filechooser");
  await page.getByLabel("Seleccionar video", { exact: true }).click();
  const picker = await gallery;
  expect(await picker.element().getAttribute("capture")).toBeNull();
  await picker.setFiles([]);
  await capture(page, "video");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page).toHaveURL(/\/reels$/);
  await expect
    .poll(() =>
      page
        .locator("video:visible")
        .first()
        .evaluate((video: HTMLVideoElement) => video.currentTime),
    )
    .toBeGreaterThan(0);
});
