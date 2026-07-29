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
