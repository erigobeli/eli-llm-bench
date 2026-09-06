import { expect, test } from "@playwright/test";

test("nome, indicadores, quatro rotas e layout sem rolagem horizontal", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle("CRMBench Modelo");
  await expect(
    page.getByRole("link", { name: "CRMBench Modelo", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-metric="totalClients"] .metric-value'),
  ).toHaveText("5");
  await expect(
    page.locator('[data-metric="openDeals"] .metric-value'),
  ).toHaveText("6");
  await expect(
    page.locator('[data-metric="pipelineValueInCents"] .metric-value'),
  ).toHaveText(/10\.100,00/);
  for (const [route, heading] of [
    ["/", "Visão geral"],
    ["/clientes", "Clientes"],
    ["/negocios", "Negócios"],
    ["/pipeline", "Pipeline"],
  ]) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: heading, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Carregando dados...")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${heading}.png`),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("clientes: pagina quatro registros, valida, cria, busca, edita e exclui com confirmacao", async ({
  page,
}, testInfo) => {
  const list = page.waitForResponse(
    (response) =>
      response.url().includes("/api/clients?") &&
      response.url().includes("pageSize=4"),
  );
  await page.goto("/clientes");
  await list;
  await expect(page.getByTestId("client-row")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Anterior", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.getByTestId("client-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(page.getByTestId("client-row")).toHaveCount(4);
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  await page.getByRole("button", { name: "Salvar cliente" }).click();
  await expect(page.getByRole("alert")).toContainText("nome");
  const name = `Cliente de teste ${testInfo.project.name}`;
  await page.getByLabel("Nome *", { exact: true }).fill(`  ${name}  `);
  await page
    .getByLabel("E-mail *", { exact: true })
    .fill(`teste-${testInfo.project.name}@example.com`);
  await page
    .getByLabel("Empresa", { exact: true })
    .fill("  Empresa de teste  ");
  await page.getByRole("button", { name: "Salvar cliente" }).click();
  await expect(page.getByRole("status", { name: "Notificação" })).toContainText(
    "Cliente criado com sucesso",
  );
  await page.getByRole("searchbox", { name: "Buscar" }).fill(name);
  await expect(page.getByTestId("client-row")).toHaveCount(1);
  await expect(page.getByTestId("client-row")).toContainText(
    "Empresa de teste",
  );
  await page
    .getByRole("button", { name: `Editar ${name}`, exact: true })
    .click();
  await page.getByLabel("Nome *", { exact: true }).fill(`${name} editado`);
  await page.getByRole("button", { name: "Salvar cliente" }).click();
  await expect(page.getByRole("status", { name: "Notificação" })).toContainText(
    "Cliente atualizado",
  );
  await page.getByRole("searchbox", { name: "Buscar" }).fill(`${name} editado`);
  await expect(page.getByTestId("client-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: `Excluir ${name} editado`, exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Esta ação não pode ser desfeita",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByTestId("client-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: `Excluir ${name} editado`, exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page.getByRole("status", { name: "Notificação" })).toContainText(
    "Cliente excluído",
  );
  await expect(page.getByText("Nenhum registro encontrado")).toBeVisible();
});

test("cliente com negocios nao pode ser excluido e Ver negocios filtra o relacionamento", async ({
  page,
}) => {
  await page.goto("/clientes");
  const row = page.locator('[data-testid="client-row"][data-id="5"]');
  await row
    .getByRole("button", { name: "Excluir Aurora Saúde", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "possui negócios relacionados",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await row.getByRole("link", { name: "Ver negócios de Aurora Saúde" }).click();
  await expect(page).toHaveURL(/clientId=5/);
  await expect(page.getByTestId("deal-row")).toHaveCount(1);
  await expect(page.getByTestId("deal-row")).toContainText(
    "Aplicativo de agendamento",
  );
  await expect(page.getByLabel("Cliente", { exact: true })).toHaveValue("5");
});

test("negocios: paginacao, criacao, filtros combinados, edicao e exclusao", async ({
  page,
}, testInfo) => {
  const list = page.waitForResponse(
    (response) =>
      response.url().includes("/api/deals?") &&
      response.url().includes("pageSize=4"),
  );
  await page.goto("/negocios");
  await list;
  await expect(page.getByTestId("deal-row")).toHaveCount(4);
  const first = await page
    .getByTestId("deal-row")
    .first()
    .getAttribute("data-id");
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.getByTestId("deal-row").first()).not.toHaveAttribute(
    "data-id",
    first!,
  );
  await expect(page.getByTestId("deal-row")).toHaveCount(4);
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(page.getByTestId("deal-row").first()).toHaveAttribute(
    "data-id",
    first!,
  );
  const title = `Negócio de teste ${testInfo.project.name}`;
  await page.getByRole("button", { name: "Novo negócio", exact: true }).click();
  await page.getByLabel("Título *", { exact: true }).fill(title);
  await page.getByLabel("Cliente *", { exact: true }).selectOption("1");
  await page.getByLabel("Valor (R$) *", { exact: true }).fill("-1");
  await page.getByRole("button", { name: "Salvar negócio" }).click();
  await expect(page.getByRole("alert")).toContainText("valor válido");
  await page.getByLabel("Valor (R$) *", { exact: true }).fill("1.234,56");
  await page.getByLabel("Etapa *", { exact: true }).selectOption("proposal");
  await page.getByRole("button", { name: "Salvar negócio" }).click();
  await expect(page.getByRole("status", { name: "Notificação" })).toContainText(
    "Negócio criado",
  );
  await page.getByRole("searchbox", { name: "Buscar" }).fill(title);
  await page.getByLabel("Etapa", { exact: true }).selectOption("proposal");
  await page.getByLabel("Cliente", { exact: true }).selectOption("1");
  await expect(page.getByTestId("deal-row")).toHaveCount(1);
  await expect(page.getByTestId("deal-row")).toContainText("1.234,56");
  await page.getByLabel("Cliente", { exact: true }).selectOption("2");
  await expect(page.getByText("Nenhum registro encontrado")).toBeVisible();
  await page.getByLabel("Cliente", { exact: true }).selectOption("1");
  await page
    .getByRole("button", { name: `Editar ${title}`, exact: true })
    .click();
  await page.getByLabel("Título *", { exact: true }).fill(`${title} editado`);
  await page.getByLabel("Valor (R$) *", { exact: true }).fill("0");
  await page.getByLabel("Etapa *", { exact: true }).selectOption("won");
  await page.getByRole("button", { name: "Salvar negócio" }).click();
  await expect(page.getByRole("status", { name: "Notificação" })).toContainText(
    "Negócio atualizado",
  );
  await page
    .getByRole("searchbox", { name: "Buscar" })
    .fill(`${title} editado`);
  await expect(page.getByTestId("deal-row")).toHaveCount(1);
  await expect(page.getByTestId("deal-row")).toContainText("Fechado");
  await expect(page.getByTestId("deal-row")).toContainText("0,00");
  await page
    .getByRole("button", { name: `Excluir ${title} editado`, exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page.getByText("Nenhum registro encontrado")).toBeVisible();
});

test("pipeline: quatro colunas, arraste no desktop e seletor persistente", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/pipeline");
  await expect(page.getByTestId("deal-card")).toHaveCount(8);
  await expect(page.locator(".column-header h2")).toHaveText([
    "Novo",
    "Em contato",
    "Proposta",
    "Fechado",
  ]);
  for (const stage of ["new", "contact", "proposal", "won"])
    await expect(
      page.locator(`[data-stage="${stage}"] [data-testid="deal-card"]`),
    ).toHaveCount(2);
  const card = page.locator('[data-testid="deal-card"][data-id="1"]');
  try {
    if (testInfo.project.name === "desktop") {
      await card.dragTo(page.locator('[data-stage="proposal"] .column-header'));
      await expect(
        page.locator('[data-stage="proposal"] [data-id="1"]'),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.locator('[data-stage="proposal"] [data-id="1"]'),
      ).toBeVisible();
    }
    await card.getByRole("combobox").selectOption("contact");
    await expect(
      page.locator('[data-stage="contact"] [data-id="1"]'),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.locator('[data-stage="contact"] [data-id="1"]'),
    ).toBeVisible();
    const response = await request.get(
      "/api/deals?search=Site%20institucional",
    );
    expect((await response.json()).data[0].stage).toBe("contact");
  } finally {
    await request.patch("/api/deals/1", { data: { stage: "new" } });
  }
});

test("carregamento, falha de rede e recuperacao visiveis", async ({ page }) => {
  await page.route("**/api/clients?*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Falha temporária de teste." }),
    });
  });
  await page.goto("/clientes");
  await expect(page.getByText("Carregando dados...")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Falha temporária de teste.",
  );
  await page.unroute("**/api/clients?*");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByTestId("client-row")).toHaveCount(4);
});
