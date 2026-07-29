# Resultados

Cada execução oficial terá um diretório:

```text
results/<run-id>/
├── result.json
├── report.md
├── judges/
│   ├── judge-01.json
│   └── judge-02.json
├── evaluation-failures/
├── screenshots/
└── project/
```

Não são publicados `node_modules`, banco local, build, cobertura, caches, segredos
ou logs brutos.

## Conteúdo do relatório

`report.md` é a versão explicada do resultado. Ele informa o que funcionou, o que
falhou, se houve recuperação e por que os juízes deram os 20 pontos subjetivos.
Detalhes técnicos aparecem apenas quando ajudam a comprovar ou explicar o problema.

O relatório é produzido a partir de `result.json` e dos dois arquivos sanitizados
em `judges/`. Ele organiza as evidências, mas não pode mudar a pontuação.

Ainda não existem execuções oficiais.
