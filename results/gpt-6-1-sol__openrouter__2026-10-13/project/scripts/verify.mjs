import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { defaultDbPath, setupDatabase } from '../dist/server/database.js';

// Uses an isolated seeded database and always terminates the temporary service.
mkdirSync(resolve('.data'), { recursive: true });
const directory = mkdtempSync(resolve('.data/verify-'));
const useDefaults = process.argv.includes('--default');
const port = Number(useDefaults ? 3000 : process.env.VERIFY_PORT || 3137);
const origin = `http://127.0.0.1:${port}`;
const dbPath = useDefaults ? resolve(defaultDbPath) : join(directory, 'verify.sqlite');
if (!useDefaults) setupDatabase(dbPath);
let service;
let browser;
let serviceOutput = '';
async function start() {
  serviceOutput = '';
  const env = { ...process.env };
  if (useDefaults) { delete env.PORT; delete env.DB_PATH; }
  else { env.PORT = String(port); env.DB_PATH = dbPath; }
  service = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm start'], {
    cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  service.stdout.on('data', data => { serviceOutput += data.toString(); });
  service.stderr.on('data', data => { serviceOutput += data.toString(); });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (service.exitCode !== null) throw new Error(`Servidor encerrou: ${serviceOutput}`);
    try {
      const response = await fetch(`${origin}/api/health`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: 'ok' });
      return;
    } catch { await delay(500); }
  }
  throw new Error(`Health não respondeu em 60 segundos: ${serviceOutput}`);
}
async function stop() {
  if (!service) return;
  const child = service;
  service = null;
  if (child.exitCode !== null) return;
  const exited = new Promise(resolveExit => child.once('exit', resolveExit));
  spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  await Promise.race([exited, delay(5000)]);
}
async function json(path) { return (await fetch(`${origin}/api${path}`)).json(); }
async function checkPage(page, path, rowCount) {
  await page.goto(`${origin}${path}`);
  await page.waitForSelector('h1');
  if (rowCount) await page.waitForSelector(`[data-testid="${rowCount}"]`);
  await page.waitForFunction(() => !document.querySelector('.spin'));
  assert.equal(await page.title(), 'CRMBench Modelo');
  assert.equal(await page.getByText('CRMBench Modelo', { exact: true }).first().isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Rolagem horizontal em ${path}`);
}
try {
  await start();
  assert.deepEqual(await json('/dashboard'), { totalClients: 5, openDeals: 6, pipelineValueInCents: 1010000 });
  for (const route of ['/', '/clientes', '/negocios', '/pipeline']) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<title>CRMBench Modelo<\/title>/);
  }
  console.log('npm start: health, indicadores e quatro rotas de produção OK.');

  if (process.argv.includes('--ui') && !useDefaults) {
    process.env.PLAYWRIGHT_BROWSERS_PATH ||= resolve('.data/playwright');
    process.env.TEMP = join(directory, 'temp');
    process.env.TMP = process.env.TEMP;
    mkdirSync(process.env.TEMP, { recursive: true });
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR' });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await checkPage(page, '/', 'metric');
    await page.screenshot({ path: resolve('.data/dashboard-desktop.png'), fullPage: true });
    await checkPage(page, '/clientes', 'client-row');
    assert.equal(await page.locator('[data-testid="client-row"]').count(), 4);
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="client-row"]').length === 1);
    await page.getByRole('button', { name: 'Anterior', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="client-row"]').length === 4);
    await page.getByRole('button', { name: 'Novo cliente', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar cliente' }).click();
    assert.equal(await page.getByRole('alert').isVisible(), true);
    await page.getByLabel('Nome *', { exact: true }).fill('Contato de verificação');
    await page.getByLabel('E-mail *', { exact: true }).fill('verificacao@example.com');
    await page.getByLabel('Empresa', { exact: true }).fill('Empresa de verificação');
    await page.getByRole('button', { name: 'Salvar cliente' }).click();
    await page.waitForSelector('dialog', { state: 'detached' });
    await page.getByRole('searchbox').fill('Contato de verificação');
    await page.getByRole('button', { name: 'Editar cliente Contato de verificação' }).click();
    await page.getByLabel('Nome *', { exact: true }).fill('Contato atualizado');
    await page.getByRole('button', { name: 'Salvar cliente' }).click();
    await page.waitForSelector('dialog', { state: 'detached' });
    await page.getByRole('searchbox').fill('Contato atualizado');
    await page.getByRole('link', { name: 'Ver negócios de Contato atualizado' }).click();
    await page.getByText('Nenhum negócio encontrado', { exact: true }).waitFor();
    const relatedClientId = new URL(page.url()).searchParams.get('clientId');
    await page.getByRole('button', { name: 'Novo negócio', exact: true }).click();
    await page.getByLabel('Título *', { exact: true }).fill('Negócio de verificação');
    await page.getByLabel('Valor (R$) *', { exact: true }).fill('123,45');
    await page.getByLabel('Etapa *', { exact: true }).selectOption('proposal');
    await page.getByRole('button', { name: 'Salvar negócio' }).click();
    await page.waitForSelector('[data-testid="deal-row"]');
    const related = await json(`/deals?clientId=${relatedClientId}`);
    assert.equal(related.data.length, 1);
    assert.equal(related.data[0].valueInCents, 12345);
    assert.equal(related.data[0].stage, 'proposal');
    const temporaryDealId = related.data[0].id;
    await page.getByRole('button', { name: 'Editar negócio Negócio de verificação' }).click();
    await page.getByLabel('Título *', { exact: true }).fill('Negócio atualizado');
    await page.getByRole('button', { name: 'Salvar negócio' }).click();
    await page.waitForSelector('dialog', { state: 'detached' });
    await page.getByRole('button', { name: 'Excluir negócio Negócio atualizado' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir negócio', exact: true }).click();
    await page.getByText('Nenhum negócio encontrado', { exact: true }).waitFor();
    assert.equal((await json(`/deals?clientId=${relatedClientId}`)).data.length, 0);
    await checkPage(page, '/clientes', 'client-row');
    await page.getByRole('searchbox').fill('Contato atualizado');
    await page.getByRole('button', { name: 'Excluir cliente Contato atualizado' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir cliente', exact: true }).click();
    await page.getByText('Nenhum cliente encontrado', { exact: true }).waitFor();
    await checkPage(page, '/negocios', 'deal-row');
    assert.equal(await page.locator('[data-testid="deal-row"]').count(), 4);
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="deal-row"]')?.getAttribute('data-id') === '5');
    await page.getByRole('button', { name: 'Anterior', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="deal-row"]')?.getAttribute('data-id') === '1');
    await page.getByRole('combobox', { name: 'Etapa', exact: true }).selectOption('proposal');
    await page.getByRole('combobox', { name: 'Cliente', exact: true }).selectOption('1');
    await page.getByRole('searchbox').fill('marca');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="deal-row"]').length === 1 && document.querySelector('[data-testid="deal-row"]')?.getAttribute('data-id') === '6');
    await checkPage(page, '/pipeline', 'deal-card');
    assert.equal(await page.locator('[data-testid="deal-card"]').count(), 8);
    await page.locator('[data-testid="deal-card"][data-id="1"]').dragTo(page.getByRole('region', { name: 'Proposta', exact: true }));
    await page.waitForFunction(() => document.querySelector('.pipeline-column.proposal [data-id="1"]'));
    await page.getByRole('combobox', { name: 'Etapa de Consultoria de conteúdo' }).selectOption('contact');
    await page.waitForFunction(() => document.querySelector('.pipeline-column.contact [data-id="2"]'));
    await stop();
    await start();
    await page.reload();
    await page.waitForSelector('.pipeline-column.proposal [data-id="1"]');
    await page.waitForSelector('.pipeline-column.contact [data-id="2"]');
    await page.screenshot({ path: resolve('.data/pipeline-desktop.png'), fullPage: true });
    for (const route of ['/', '/clientes', '/negocios', '/pipeline']) {
      await page.setViewportSize({ width: 390, height: 844 });
      await checkPage(page, route, route === '/' ? 'metric' : route === '/clientes' ? 'client-row' : route === '/negocios' ? 'deal-row' : 'deal-card');
      await page.screenshot({ path: resolve(`.data/${route === '/' ? 'dashboard' : route.slice(1)}-mobile.png`), fullPage: true });
    }
    assert.deepEqual(pageErrors, []);
    assert.equal((await json('/clients')).pagination.total, 5);
    assert.equal((await json('/deals')).pagination.total, 8);
    assert.ok(temporaryDealId > 8);
    console.log('UI: CRUD, validação, busca, filtros, paginação, negócios relacionados, drag-and-drop, seletor e persistência após reiniciar OK.');
    console.log('Desktop 1440×1000 e móvel 390×844 sem rolagem horizontal nem erros de JavaScript.');
  } else if (!useDefaults) {
    await fetch(`${origin}/api/deals/1`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'won' }) });
    await stop();
    await start();
    const result = await json('/deals?clientId=1&stage=won');
    assert.equal(result.data[0].id, 1);
    console.log('Mudança de etapa persistiu após reiniciar o serviço.');
  }
} finally {
  try { if (browser) await browser.close(); }
  finally {
    await stop();
    rmSync(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
    console.log('Servidor temporário encerrado e arquivos temporários removidos.');
  }
}
