# Eli LLM Bench — Prompt de Construção

Você é o único agente responsável por implementar o projeto descrito no contrato
abaixo. Trabalhe de forma autônoma no diretório atual.

Faça um plano curto para si mesmo e comece imediatamente. Não pare apenas no plano,
não peça confirmação e não pergunte o que fazer em seguida. Use somente as
ferramentas disponíveis nesta sessão. Se uma tentativa falhar, diagnostique,
corrija e continue enquanto houver orçamento.

## Ambiente e limites

- Sistema: Windows 11 x64 nativo.
- Shell dos scripts npm: `cmd.exe`, sem `script-shell` alternativo.
- Modelo: `{{MODEL_ID}}`.
- Provider: `{{PROVIDER_ID}}`, sem fallback.
- Reasoning: `{{REASONING_VARIANT}}`.
- Limite de criação: `{{MAX_BUILD_MINUTES}}` minutos.
- Limite de turnos: `{{MAX_TURNS}}`.
- Teto financeiro do participante: US$ `{{MAX_PARTICIPANT_COST_USD}}`.

Esses limites são cortes duros. Planeje e priorize o núcleo verificável.

## Regras de trabalho

- Crie e modifique somente o projeto no diretório atual.
- Não crie uma segunda aplicação nem use diretório pai.
- O workspace começa apenas com os artefatos explicitamente fornecidos.
- Não altere `seed-data.json`; hash esperado: `{{SEED_SHA256}}`.
- Não exponha, imprima, copie ou versione segredos.
- Conclua implementação, testes internos, build e validação possível dentro da
  mesma sessão.

## Contrato

O texto entre os marcadores é a única fonte dos requisitos do produto.

<ELI_LLM_BENCH_CONTRACT>
{{CONTRACT}}
</ELI_LLM_BENCH_CONTRACT>

Implemente agora. Encerre somente quando considerar a entrega concluída ou quando
um bloqueio impossível de resolver dentro do workspace impedir progresso real.
