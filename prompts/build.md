# Eli LLM Bench v1 — Prompt de construção

Construa integralmente a aplicação descrita no contrato incluído abaixo. Trabalhe
de forma autônoma no diretório atual.

Faça um plano curto para si mesmo e comece imediatamente. Não responda apenas com
o plano, não peça confirmação e não pergunte o que fazer em seguida. Se algo
falhar, diagnostique, corrija e continue enquanto houver orçamento.

## Ambiente e limites

- Sistema: Windows 11 x64 nativo.
- Shell dos scripts npm: `cmd.exe`.
- Provider: OpenRouter, sem fallback.
- Reasoning: `high` ou o equivalente mais próximo disponível.
- Tempo máximo: `{{MAX_BUILD_MINUTES}}` minutos.
- Máximo de turnos: `{{MAX_TURNS}}`.
- Teto financeiro: US$ `{{MAX_PARTICIPANT_COST_USD}}`.

Esses limites são cortes duros. Priorize primeiro instalação, banco, API,
persistência e os fluxos principais da interface.

## Regras de trabalho

- Use somente as ferramentas disponíveis na sessão.
- Trabalhe apenas no diretório atual.
- Não altere `seed-data.json`.
- O SHA-256 esperado do seed é `{{SEED_SHA256}}`.
- Não exponha segredos, credenciais privadas ou conteúdo de configurações locais.
- Use scripts portáveis para o ambiente Windows descrito no contrato.
- Valide `npm install`, `npm run db:setup`, `npm test`, `npm run build` e
  `npm start`.
- Ao validar o servidor, inicie-o temporariamente em segundo plano, verifique o
  health, encerre o processo e continue. Não deixe um processo persistente
  bloqueando a sessão.
- Termine com um resumo curto do que foi entregue e dos comandos executados.

<ELI_LLM_BENCH_CONTRACT>
{{CONTRACT}}
</ELI_LLM_BENCH_CONTRACT>
