import { expect, test, type Page } from "@playwright/test";
import { mockFirebase, SESSION_KEY, signIn } from "./helpers/firebase";

async function uid(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "{}").uid as string,
    SESSION_KEY,
  );
}
async function chooseStory(page: Page, path = "tests/fixtures/photo.jpg") {
  await page.goto("/compose?type=story");
  const picker = page.waitForEvent("filechooser");
  await page.getByLabel("Seleccionar foto o video", { exact: true }).click();
  await (await picker).setFiles(path);
  await page
    .getByLabel("Contenido de la historia", { exact: true })
    .fill("Mi momento de hoy");
  await page
    .getByRole("button", { name: "PUBLICAR HISTORIA", exact: true })
    .click();
  await expect(page).toHaveURL("/");
}

test("only followed accounts with a current story appear, and the bubble opens the story", async ({
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
    const otherId = await uid(other);
    await page.reload();
    await expect(
      page.getByRole("button", { name: /^Ver historias de/ }),
    ).toHaveCount(0);
    await page.goto(`/creator/${otherId}`);
    await page.getByRole("button", { name: "SEGUIR", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "SIGUIENDO", exact: true }),
    ).toBeVisible();
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /^Ver historias de/ }),
    ).toHaveCount(0);
    await chooseStory(other);
    await expect(
      other.getByRole("button", { name: "Ver mi historia", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Ver historias de Otra cuenta",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Ver historias de Otra cuenta",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(`http://localhost:8082/story?id=${otherId}`);
    await expect(
      page.getByText("Mi momento de hoy", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Imagen de la historia", exact: true }),
    ).toBeVisible();
    await page.goto(`/creator/${otherId}`);
    await page.getByRole("button", { name: "SIGUIENDO", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "SEGUIR", exact: true }),
    ).toBeVisible();
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /^Ver historias de/ }),
    ).toHaveCount(0);
    await page.goto(`/story?id=${otherId}`);
    await expect(
      page.getByText("SIN HISTORIAS", { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("a story disappears from the strip and an open viewer when it reaches 24 hours", async ({
  page,
}) => {
  await mockFirebase(page);
  await signIn(page);
  const accountId = await uid(page);
  const now = new Date();
  await page.clock.install({ time: now });
  const result = await page.request.patch(
    "http://127.0.0.1:8080/v1/projects/demo-cut/databases/(default)/documents/stories/expiring-story",
    {
      headers: { Authorization: "Bearer owner" },
      data: {
        fields: {
          creatorId: { stringValue: accountId },
          text: { stringValue: "Historia por vencer" },
          imageUri: {
            stringValue:
              "https://res.cloudinary.com/cut-test-cloud/image/upload/v1/story.jpg",
          },
          videoUri: { stringValue: "" },
          createdAt: {
            timestampValue: new Date(
              now.getTime() - 24 * 60 * 60 * 1000 + 10000,
            ).toISOString(),
          },
        },
      },
    },
  );
  expect(result.ok()).toBe(true);
  await page.route("https://res.cloudinary.com/cut-test-cloud/**", (route) =>
    route.fulfill({
      path: "tests/fixtures/photo.jpg",
      contentType: "image/jpeg",
    }),
  );
  await expect(
    page.getByRole("button", { name: "Ver mi historia", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ver mi historia", exact: true })
    .click();
  await expect(
    page.getByText("Historia por vencer", { exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(11000);
  await expect(page.getByText("SIN HISTORIAS", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Crear historia", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ver mi historia", exact: true }),
  ).toHaveCount(0);
});

test("a video story plays in the viewer and does not become a reel or feed post", async ({
  page,
}) => {
  await mockFirebase(page);
  await signIn(page);
  await chooseStory(page, "tests/fixtures/video.mp4");
  await expect(page.getByText("0 CORTES", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Ver mi historia", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator("video")
        .first()
        .evaluate((video: HTMLVideoElement) => video.currentTime),
    )
    .toBeGreaterThan(0);
});
