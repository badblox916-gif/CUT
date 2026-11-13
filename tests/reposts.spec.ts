import { expect, test } from "@playwright/test";
import { mockFirebase, SESSION_KEY, signIn } from "./helpers/firebase";

test("a repost has the sharer's identity and embeds the live original in feed and profiles", async ({
  page,
  browser,
}) => {
  await mockFirebase(page);
  await signIn(page);
  await page.goto("/compose");
  await page
    .getByLabel("Contenido de la publicación", { exact: true })
    .fill("El arte es de quien lo crea #Cultura");
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await page.getByLabel("Comentarios", { exact: true }).click();
  await expect(page).toHaveURL(/\/post\//);
  const originalUrl = page.url();
  const originalId = new URL(originalUrl).pathname.split("/").pop()!;
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
    const repostId = `repost_${originalId}_${otherId}`;
    await other
      .getByTestId(`post-${originalId}`)
      .getByLabel("Repostear", { exact: true })
      .click();
    const repost = other.getByTestId(`post-${repostId}`);
    await expect(
      repost.getByRole("button", {
        name: "Ver perfil de Otra cuenta",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      repost.getByText("REPOSTEÓ UN CORTE", { exact: true }),
    ).toBeVisible();
    await expect(
      repost
        .getByTestId(`embedded-${originalId}`)
        .getByText("@mi.cuenta", { exact: false }),
    ).toBeVisible();
    await expect(
      repost.getByText("El arte es de quien lo crea #Cultura", { exact: true }),
    ).toBeVisible();
    await other.screenshot({
      path: "test-results/repost-feed.png",
      animations: "disabled",
    });
    await other.reload();
    await expect(repost).toBeVisible();
    await other.goto("/profile");
    await other.getByText("REPOSTS", { exact: true }).click();
    await expect(repost).toBeVisible();
    await other.getByText("MIS CORTES", { exact: true }).click();
    await expect(repost).toBeVisible();
    await page.goto(`/creator/${otherId}`);
    const received = page.getByTestId(`post-${repostId}`);
    await expect(
      received.getByText("El arte es de quien lo crea #Cultura", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "SEGUIR", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "SIGUIENDO", exact: true }),
    ).toBeVisible();
    await page.goto("/");
    await page.getByRole("button", { name: "SIGUIENDO", exact: true }).click();
    await expect(received).toBeVisible();
    await received
      .getByLabel("Abrir publicación original", { exact: true })
      .click();
    await expect(page).toHaveURL(originalUrl);
    await page
      .getByRole("button", { name: "Opciones de publicación", exact: true })
      .click();
    await page
      .getByRole("button", { name: "ELIMINAR PUBLICACIÓN", exact: true })
      .click();
    await page
      .getByRole("button", { name: "SÍ, ELIMINAR", exact: true })
      .click();
    await expect(
      page.getByText("CORTE NO ENCONTRADO", { exact: true }),
    ).toBeVisible();
    await expect(
      repost.getByText("La publicación original ya no está disponible.", {
        exact: true,
      }),
    ).toBeVisible();
    await repost.getByLabel("Opciones de repost", { exact: true }).click();
    await other
      .getByRole("button", { name: "ELIMINAR REPOST", exact: true })
      .click();
    await other
      .getByRole("button", { name: "SÍ, ELIMINAR", exact: true })
      .click();
    await expect(repost).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("removing a repost removes only the wrapper and leaves the original", async ({
  page,
}) => {
  await mockFirebase(page);
  await signIn(page);
  await page.goto("/compose");
  await page
    .getByLabel("Contenido de la publicación", { exact: true })
    .fill("Mi publicación original");
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await page.getByLabel("Repostear", { exact: true }).click();
  const wrapper = page.getByText("REPOSTEÓ UN CORTE", { exact: true });
  await expect(wrapper).toBeVisible();
  await page.goto("/profile");
  await page.getByText("REPOSTS", { exact: true }).click();
  await page.getByLabel("Repostear", { exact: true }).click();
  await expect(
    page.getByText("DALE VOZ A OTROS CORTES", { exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("1 CORTES", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Mi publicación original", { exact: true }),
  ).toBeVisible();
});

test("legacy reposts upgrade once and embed a photo whose original is outside the feed page", async ({
  page,
  browser,
}) => {
  await mockFirebase(page);
  await signIn(page);
  const author = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "{}").uid as string,
    SESSION_KEY,
  );
  const context = await browser.newContext({
    baseURL: "http://localhost:8082",
  });
  const other = await context.newPage();
  try {
    await signIn(other, "second@example.test");
    const sharer = await other.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "{}").uid as string,
      SESSION_KEY,
    );
    await page.route("https://res.cloudinary.com/cut-test-cloud/**", (route) =>
      route.fulfill({
        path: "tests/fixtures/photo.jpg",
        contentType: "image/jpeg",
      }),
    );
    const base =
      "http://127.0.0.1:8080/v1/projects/demo-cut/databases/(default)/documents";
    for (let i = 0; i < 26; i++) {
      const result = await page.request.patch(
        `${base}/posts/${i === 0 ? "legacy-photo" : `newer-${i}`}`,
        {
          headers: { Authorization: "Bearer owner" },
          data: {
            fields: {
              creatorId: { stringValue: author },
              text: {
                stringValue:
                  i === 0
                    ? "Foto original de antes"
                    : `Publicación más nueva ${i}`,
              },
              tag: { stringValue: "" },
              imageUri: {
                stringValue:
                  i === 0
                    ? "https://res.cloudinary.com/cut-test-cloud/image/upload/photo.jpg"
                    : "",
              },
              videoUri: { stringValue: "" },
              reel: { booleanValue: false },
              poll: { nullValue: null },
              createdAt: {
                timestampValue: new Date(
                  Date.now() - 60000 + i * 100,
                ).toISOString(),
              },
            },
          },
        },
      );
      expect(result.ok()).toBe(true);
    }
    const result = await page.request.patch(
      `${base}/reactions/legacy-photo_${sharer}`,
      {
        headers: { Authorization: "Bearer owner" },
        data: {
          fields: {
            postId: { stringValue: "legacy-photo" },
            userId: { stringValue: sharer },
            liked: { booleanValue: false },
            reposted: { booleanValue: true },
            vote: { integerValue: "-1" },
          },
        },
      },
    );
    expect(result.ok()).toBe(true);
    const repost = page.getByTestId(`post-repost_legacy-photo_${sharer}`);
    await expect(
      repost.getByText("Foto original de antes", { exact: true }),
    ).toBeVisible();
    await expect(repost.locator("img")).toBeVisible();
    await expect(page.getByTestId("post-legacy-photo")).toHaveCount(0);
    await other.goto("/profile");
    await other.getByText("REPOSTS", { exact: true }).click();
    await expect(
      other.getByText("Foto original de antes", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(repost).toHaveCount(1);
    await expect(
      repost.getByText("Foto original de antes", { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
