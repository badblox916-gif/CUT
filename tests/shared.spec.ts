import { expect, test } from "@playwright/test";
import { mockFirebase, signIn } from "./helpers/firebase";

test("two independent devices share posts, profiles, likes and comments while saves stay private", async ({
  page,
  browser,
}) => {
  await mockFirebase(page);
  await signIn(page);
  const otherContext = await browser.newContext({
    baseURL: "http://localhost:8082",
    viewport: { width: 390, height: 844 },
  });
  const other = await otherContext.newPage();
  try {
    await signIn(other, "second@example.test");
    await page.goto("/compose");
    const chooser = page.waitForEvent("filechooser");
    await page.getByLabel("Añadir foto o video", { exact: true }).click();
    await (await chooser).setFiles("tests/fixtures/photo.jpg");
    await page
      .getByLabel("Contenido de la publicación", { exact: true })
      .fill("Un corte para todos #Comunidad");
    await page
      .getByRole("button", { name: "PUBLICAR CORTE", exact: true })
      .click();
    await expect(page).toHaveURL("/");
    await expect(
      other.getByText("Un corte para todos #Comunidad", { exact: true }),
    ).toBeVisible();
    await expect(
      other.locator('img[src*="127.0.0.1:9199"]').first(),
    ).toBeVisible();
    await other.getByRole("button", { name: "Me gusta", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Me gusta", exact: true }),
    ).toContainText("1");
    await other.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(
      other.getByRole("button", { name: "Quitar de guardados", exact: true }),
    ).toBeVisible();
    await other
      .getByRole("button", { name: "Ver perfil de Mi cuenta", exact: true })
      .first()
      .click();
    await expect(other.getByText("@mi.cuenta", { exact: true })).toBeVisible();
    await other.getByRole("button", { name: "SEGUIR", exact: true }).click();
    await expect(
      other.getByRole("button", { name: "SIGUIENDO", exact: true }),
    ).toBeVisible();
    await other
      .getByRole("button", { name: "Comentarios", exact: true })
      .click();
    await other
      .getByLabel("Escribir comentario", { exact: true })
      .fill("Te veo desde otro dispositivo");
    await other.getByRole("button", { name: "ENVIAR", exact: true }).click();
    await expect(
      other.getByText("Te veo desde otro dispositivo", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Comentarios", exact: true })
      .click();
    await expect(
      page.getByText("Te veo desde otro dispositivo", { exact: true }),
    ).toBeVisible();
    await page.goto("/profile");
    await page.getByText("GUARDADOS", { exact: true }).last().click();
    await expect(
      page.getByText("TUS INSPIRACIONES, A MANO", { exact: true }),
    ).toBeVisible();
    await other.reload();
    await expect(
      other.getByText("Te veo desde otro dispositivo", { exact: true }),
    ).toBeVisible();
    await other.goto("/profile");
    await other.getByText("GUARDADOS", { exact: true }).last().click();
    await expect(
      other.getByText("Un corte para todos #Comunidad", { exact: true }),
    ).toBeVisible();
  } finally {
    await otherContext.close();
  }
});
