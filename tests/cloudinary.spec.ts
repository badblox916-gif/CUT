/// <reference types="node" />
import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mockFirebase, signIn } from "./helpers/firebase";

test.skip(
  process.env.CUT_TEST_CLOUDINARY !== "1",
  "Run with CUT_TEST_CLOUDINARY=1 to select the free upload provider.",
);

test("free camera uploads publish shared image/video URLs and keep the draft after an upload error", async ({
  page,
}) => {
  await mockFirebase(page);
  await signIn(page);
  let rejectUpload = true;
  const kinds: string[] = [];
  await page.route(
    "https://api.cloudinary.com/v1_1/cut-test-cloud/**",
    async (route) => {
      if (route.request().method() === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers":
              route.request().headers()["access-control-request-headers"] ??
              "*",
          },
        });
      const body = route.request().postDataBuffer()?.toString() ?? "";
      expect(body).toContain("cut-test-preset");
      expect(body).toContain('name="file"');
      expect(body).not.toContain("api_secret");
      if (rejectUpload)
        return route.fulfill({
          status: 400,
          headers: { "access-control-allow-origin": "*" },
          json: { error: { message: "Upload rejected" } },
        });
      const kind = route.request().url().includes("/video/")
        ? "video"
        : "image";
      kinds.push(kind);
      await route.fulfill({
        headers: { "access-control-allow-origin": "*" },
        json: {
          secure_url: `https://res.cloudinary.com/cut-test-cloud/${kind}/upload/v1/test.${kind === "video" ? "mp4" : "jpg"}`,
        },
      });
    },
  );
  await page.route("https://res.cloudinary.com/cut-test-cloud/**", (route) =>
    route.fulfill({
      path: route.request().url().endsWith("mp4")
        ? "tests/fixtures/video.mp4"
        : "tests/fixtures/photo.jpg",
      contentType: route.request().url().endsWith("mp4")
        ? "video/mp4"
        : "image/jpeg",
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.goto("/compose");
  await page.getByRole("button", { name: "Abrir cámara", exact: true }).click();
  const photo = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "TOMAR FOTO", exact: true }).click();
  await (await photo).setFiles("tests/fixtures/photo.jpg");
  await page
    .getByLabel("Contenido de la publicación", { exact: true })
    .fill("Mi foto sin Blaze");
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "No se pudo subir el archivo",
  );
  await expect(page).toHaveURL(/\/compose$/);
  await expect(
    page.getByLabel("Contenido de la publicación", { exact: true }),
  ).toHaveValue("Mi foto sin Blaze");
  rejectUpload = false;
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await expect(
    page.locator('img[src^="https://res.cloudinary.com/"]').first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Mi foto sin Blaze", { exact: true }),
  ).toBeVisible();
  await page.goto("/compose?type=reel");
  await page.getByRole("button", { name: "Abrir cámara", exact: true }).click();
  const video = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "GRABAR VIDEO", exact: true }).click();
  await (await video).setFiles("tests/fixtures/video.mp4");
  await page
    .getByLabel("Contenido de la publicación", { exact: true })
    .fill("Mi reel sin Blaze");
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page).toHaveURL(/\/reels$/);
  await expect
    .poll(() =>
      page
        .locator("video")
        .first()
        .evaluate((video: HTMLVideoElement) => video.currentTime),
    )
    .toBeGreaterThan(0);
  expect(kinds).toEqual(["image", "video"]);
});

test("large story photos shrink before upload and a canceled upload preserves the prepared draft", async ({
  page,
}) => {
  await mockFirebase(page);
  await signIn(page);
  await page.goto("/compose?type=story");
  const original = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4000;
    canvas.height = 2000;
    const context = canvas.getContext("2d")!;
    const pixels = context.createImageData(4000, 2000);
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i] = (i * 13) % 256;
      pixels.data[i + 1] = (i * 7 + (i >> 12)) % 256;
      pixels.data[i + 2] = (i >> 7) % 256;
      pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.94).split(",")[1];
  });
  const buffer = Buffer.from(original, "base64");
  const opened = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Seleccionar foto o video", exact: true })
    .click();
  await (
    await opened
  ).setFiles({ name: "large-photo.jpg", mimeType: "image/jpeg", buffer });
  const preview = page.locator('img[src^="data:"], img[src^="blob:"]');
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBe(1920);
  await expect
    .poll(() =>
      preview.evaluate((image: HTMLImageElement) => image.naturalHeight),
    )
    .toBe(960);
  const source = await preview.getAttribute("src");
  await page
    .getByLabel("Contenido de la historia", { exact: true })
    .fill("Una historia optimizada");
  let attempts = 0;
  let uploadedBytes = 0;
  let releaseFirst!: () => void;
  const first = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  await page.route(
    "https://api.cloudinary.com/v1_1/cut-test-cloud/**",
    async (route) => {
      const headers = {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "*",
      };
      if (route.request().method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      attempts += 1;
      uploadedBytes = route.request().postDataBuffer()!.length;
      if (attempts === 1) await first;
      await route
        .fulfill({
          headers,
          json: {
            secure_url:
              "https://res.cloudinary.com/cut-test-cloud/image/upload/v1/optimized.jpg",
          },
        })
        .catch(() => {});
    },
  );
  await page.route("https://res.cloudinary.com/cut-test-cloud/**", (route) =>
    route.fulfill({
      path: "tests/fixtures/photo.jpg",
      contentType: "image/jpeg",
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page
    .getByRole("button", { name: "PUBLICAR HISTORIA", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "CANCELAR SUBIDA", exact: true }),
  ).toBeVisible();
  await expect.poll(() => attempts).toBe(1);
  expect(uploadedBytes).toBeLessThan(buffer.length / 2);
  console.log(
    `Story photo: ${buffer.length} original bytes → ${uploadedBytes} uploaded bytes (including multipart).`,
  );
  await page
    .getByRole("button", { name: "CANCELAR SUBIDA", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("La subida se canceló");
  releaseFirst();
  await expect(preview).toHaveAttribute("src", source!);
  await expect(
    page.getByLabel("Contenido de la historia", { exact: true }),
  ).toHaveValue("Una historia optimizada");
  const stories = await page.request.get(
    "http://127.0.0.1:8080/v1/projects/demo-cut/databases/(default)/documents/stories",
  );
  expect((await stories.json()).documents ?? []).toHaveLength(0);
  await page
    .getByRole("button", { name: "PUBLICAR HISTORIA", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("button", { name: "Ver mi historia", exact: true }),
  ).toBeVisible();
  expect(attempts).toBe(2);
});
