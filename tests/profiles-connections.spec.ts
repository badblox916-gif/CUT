import { expect, test, type Page } from "@playwright/test";
import {
  completeProfile,
  mockFirebase,
  SESSION_KEY,
  signIn,
  TEST_PASSWORD,
} from "./helpers/firebase";

async function uid(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "{}").uid as string,
    SESSION_KEY,
  );
}
async function follow(page: Page, id: string) {
  await page.goto(`/creator/${id}`);
  await page.getByRole("button", { name: "SEGUIR", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "SIGUIENDO", exact: true }),
  ).toBeVisible();
}

test("profiles share a layout, keep saved items private, and expose live follower/following lists in both directions", async ({
  page,
  browser,
}) => {
  await mockFirebase(page);
  await signIn(page);
  const a = await uid(page);
  await page.goto("/compose");
  await page
    .getByLabel("Contenido de la publicación", { exact: true })
    .fill("Un corte que guardé en privado");
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await page.getByLabel("Guardar", { exact: true }).click();
  const secondContext = await browser.newContext({
    baseURL: "http://localhost:8082",
    viewport: { width: 390, height: 844 },
  });
  const thirdContext = await browser.newContext({
    baseURL: "http://localhost:8082",
    viewport: { width: 390, height: 844 },
  });
  const second = await secondContext.newPage();
  const third = await thirdContext.newPage();
  try {
    await signIn(second, "second@example.test");
    const b = await uid(second);
    const signup = await page.request.post(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-api-key",
      {
        data: {
          email: "third@example.test",
          password: TEST_PASSWORD,
          returnSecureToken: true,
        },
      },
    );
    expect(signup.ok()).toBe(true);
    await signIn(third, "third@example.test", false);
    await completeProfile(third, {
      name: "Tercera cuenta",
      handle: "tercera.cuenta",
      bio: "Tercer perfil",
    });
    const c = await uid(third);
    await follow(second, a);
    await follow(third, a);
    await follow(page, c);
    await page.goto("/profile");
    await expect(page.getByTestId("profile-following-count")).toContainText(
      "1",
    );
    await expect(page.getByTestId("profile-followers-count")).toContainText(
      "2",
    );
    await expect(
      page.getByRole("button", { name: "GUARDADOS", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "GUARDADOS", exact: true }).click();
    await expect(
      page.getByText("Un corte que guardé en privado", { exact: true }),
    ).toBeVisible();
    await expect(second.getByTestId("profile-followers-count")).toContainText(
      "2",
    );
    await expect(
      second.getByRole("button", { name: "GUARDADOS", exact: true }),
    ).toHaveCount(0);
    await expect(second.getByLabel("Ajustes", { exact: true })).toHaveCount(0);
    await expect(
      second.getByRole("button", { name: "EDITAR PERFIL", exact: true }),
    ).toHaveCount(0);
    await second.screenshot({
      path: "test-results/public-profile.png",
      animations: "disabled",
    });
    await second
      .getByRole("button", { name: "Ver seguidores de Mi cuenta", exact: true })
      .click();
    await expect(second).toHaveURL(
      new RegExp(`/connections\\?id=${a}&type=followers`),
    );
    await expect(
      second.getByTestId(`connection-${b}`).getByText("TÚ", { exact: true }),
    ).toBeVisible();
    const thirdRow = second.getByTestId(`connection-${c}`);
    await thirdRow.getByRole("button", { name: "SEGUIR", exact: true }).click();
    await expect(
      thirdRow.getByRole("button", { name: "SIGUIENDO", exact: true }),
    ).toBeVisible();
    await second.screenshot({
      path: "test-results/profile-followers.png",
      animations: "disabled",
    });
    await thirdRow
      .getByRole("button", {
        name: "Ver perfil de Tercera cuenta",
        exact: true,
      })
      .click();
    await expect(second).toHaveURL(`/creator/${c}`);
    await expect(
      second.getByTestId("profile-followers-count").last(),
    ).toContainText("2");
    await second
      .getByRole("button", {
        name: "Ver seguidos de Tercera cuenta",
        exact: true,
      })
      .click();
    await expect(second.getByTestId(`connection-${a}`)).toBeVisible();
    await second
      .getByRole("button", { name: "Ver perfil de Mi cuenta", exact: true })
      .click();
    await expect(second).toHaveURL(`/creator/${a}`);
    await second
      .getByRole("button", { name: "SIGUIENDO", exact: true })
      .click();
    await expect(
      second.getByRole("button", { name: "SEGUIR", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("profile-followers-count")).toContainText(
      "1",
    );
    await page
      .getByRole("button", { name: "Ver seguidos de Mi cuenta", exact: true })
      .click();
    await page
      .getByTestId(`connection-${c}`)
      .getByRole("button", { name: "SIGUIENDO", exact: true })
      .click();
    await expect(
      page.getByText("NO SIGUE A NADIE", { exact: true }),
    ).toBeVisible();
    await page.goto("/profile");
    await expect(page.getByTestId("profile-following-count")).toContainText(
      "0",
    );
    await expect(page.getByTestId("profile-followers-count")).toContainText(
      "1",
    );
    await page
      .getByRole("button", { name: "Ver seguidores de Mi cuenta", exact: true })
      .click();
    await expect(page.getByTestId(`connection-${c}`)).toBeVisible();
    await expect(page.getByTestId(`connection-${b}`)).toHaveCount(0);
    await second.reload();
    await expect(
      second.getByRole("button", { name: "GUARDADOS", exact: true }),
    ).toHaveCount(0);
    for (const viewport of [
      { width: 320, height: 700 },
      { width: 1440, height: 900 },
    ]) {
      await second.setViewportSize(viewport);
      await expect
        .poll(() =>
          second.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
    }
  } finally {
    await secondContext.close();
    await thirdContext.close();
  }
});

test("another profile exposes reels even when the requested video is outside the global feed page", async ({
  page,
  browser,
}) => {
  await mockFirebase(page);
  await signIn(page);
  const a = await uid(page);
  await page.goto("/compose?type=reel");
  const chooser = page.waitForEvent("filechooser");
  await page.getByLabel("Seleccionar video", { exact: true }).click();
  await (await chooser).setFiles("tests/fixtures/video.mp4");
  await page
    .getByLabel("Contenido de la publicación", { exact: true })
    .fill("Un reel del perfil");
  await page
    .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
    .click();
  await expect(page).toHaveURL(/\/reels$/);
  const context = await browser.newContext({
    baseURL: "http://localhost:8082",
  });
  const other = await context.newPage();
  try {
    await signIn(other, "second@example.test");
    const b = await uid(other);
    for (let i = 0; i < 25; i++) {
      const result = await page.request.patch(
        `http://127.0.0.1:8080/v1/projects/demo-cut/databases/(default)/documents/posts/recent-${i}`,
        {
          headers: { Authorization: "Bearer owner" },
          data: {
            fields: {
              creatorId: { stringValue: b },
              text: { stringValue: `Corte reciente ${i}` },
              tag: { stringValue: "" },
              imageUri: { stringValue: "" },
              videoUri: { stringValue: "" },
              reel: { booleanValue: false },
              poll: { nullValue: null },
              createdAt: { timestampValue: new Date().toISOString() },
            },
          },
        },
      );
      expect(result.ok()).toBe(true);
    }
    await other.goto(`/creator/${a}`);
    await expect(other.getByTestId("profile-posts-count")).toContainText("1");
    await other.getByRole("button", { name: "REELS", exact: true }).click();
    await other
      .getByRole("button", { name: "Ver reel Un reel del perfil", exact: true })
      .click();
    await expect(other).toHaveURL(/\/reels\?id=/);
    await expect
      .poll(() =>
        other
          .locator("video")
          .first()
          .evaluate((el: HTMLVideoElement) => el.currentTime),
      )
      .toBeGreaterThan(0);
    await other.reload();
    await expect
      .poll(() =>
        other
          .locator("video")
          .first()
          .evaluate((el: HTMLVideoElement) => el.currentTime),
      )
      .toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});
