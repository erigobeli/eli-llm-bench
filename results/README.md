# Resultados públicos

Cada execução oficial recebe uma pasta:

```text
results/<run-id>/
├── result.json
├── report.md
├── screenshots/
└── project/
```

- `result.json` contém modelo, configuração, nota, tempo, custo, uso e o estado
  dos 22 checks;
- `report.md` explica o resultado em linguagem simples;
- `screenshots/` guarda evidências visuais selecionadas;
- `project/` contém o código entregue pelo modelo no encerramento oficial.

Correções feitas depois da avaliação não substituem silenciosamente o projeto
pontuado. Uma execução inválida pode ser preservada para auditoria, mas não entra
no ranking principal.

Depois de criar ou revisar um `result.json`, execute na raiz pública:

```powershell
node .\scripts\update-ranking.mjs
```

O script atualiza a tabela do README a partir dos resultados completos. A nota
vem exclusivamente do avaliador externo; o script apenas publica e ordena os
metadados já registrados.
