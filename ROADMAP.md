# Roadmap do Eli LLM Bench v1

Este arquivo contém decisões ainda pendentes. Ele não é enviado ao participante e
não registra ambiguidades encontradas durante implementação; esse é o papel de
`AMBIGUITIES.md`.

## Antes da referência

- Confirmar as versões exatas restantes da stack e registrá-las na configuração.
- Validar o shape final de `seed-data.json` contra a implementação de referência.
- [x] OpenCode 1.18.9 confirmado: exportação por sessão contém custo, modelo,
  provider, tokens de entrada, saída, raciocínio e cache; partes permitem contar
  chamadas de ferramentas.

## Antes do piloto 1

- Implementar a referência privada e obter 80/80 automáticos.
- Implementar os 44 checks públicos no avaliador privado.
- Implementar sanitização e redação de segredos.
- Definir modelos e limiar de divergência dos juízes.
- Definir tetos provisórios do piloto para tempo, turnos e custo.
- Definir critérios objetivos de `infra_invalid`.

## Depois dos pilotos

- Calibrar apenas dependências, criticidade e limites que criarem distorções
  metodológicas documentadas.
- Congelar contrato, scoring, seed, prompts, ambiente e protocolo em `v1.0.0`.
- Gerar o ranking no README a partir de `results/*/result.json`.

Pilotos não entram no ranking e não servem para ajustar pesos até que uma nota
“pareça certa”. Se o custo real exceder o objetivo do canal, reduz-se o escopo do
produto antes do congelamento; não se encerra o modelo artificialmente para ocultar
o custo necessário.
