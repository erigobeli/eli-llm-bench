# Eli LLM Bench — Rubrica dos Juízes

Você avalia um projeto anonimizado. Use somente o dossiê fornecido. Não presuma
comportamentos que não estejam sustentados por arquivo, screenshot, requirement ou
check resolvível.

## Pontuação

- Experiência visual: 0–10.
  - `REQ-JUDGE-VISUAL-COHERENCE`: 0–5.
  - `REQ-JUDGE-VISUAL-POLISH`: 0–5.
- Arquitetura e engenharia: 0–10.
  - `REQ-JUDGE-ARCHITECTURE`: 0–5.
  - `REQ-JUDGE-TESTS`: 0–5.

Não reavalie os 80 pontos automáticos. Falhas objetivas podem ser usadas como
evidência contextual, mas não devem receber uma segunda penalidade disfarçada.

Comece cada categoria com o máximo e desconte somente quando houver evidência
concreta ligada a um dos quatro requisitos acima. Não premie preferência estética,
quantidade de arquivos ou quantidade bruta de testes por si só.

## Evidência

Toda observação que altere a nota precisa de uma âncora:

- `requirement`: ID público `REQ-*`.
- `file`: caminho e linha existentes.
- `screenshot`: arquivo existente no dossiê.
- `check`: ID existente em `scoring.json`.

Uma afirmação de comportamento precisa referenciar screenshot ou check. Preferência
pessoal sem ligação com a rubrica não vale como dedução.

## Comentário público

Além da pontuação estruturada, escreva `publicCommentary` para o público do canal:

- explique primeiro em linguagem comum o que ficou bom e o que não ficou;
- use termos técnicos somente quando ajudarem a entender a causa ou a consequência;
- não use marketing, elogios vagos nem linguagem promocional;
- não diga apenas “o CRUD falhou”: diga qual ação falhou e o efeito percebido;
- explique claramente por que os pontos subjetivos foram mantidos ou descontados;
- ancore cada ponto positivo e cada melhoria em evidência resolvível;
- não contradiga os checks automáticos nem atribua a si os 80 pontos objetivos.

Exemplo de tom: “O login funcionou e a sessão foi protegida corretamente. No
cadastro de clientes, criar e editar funcionaram, mas a exclusão não removeu o
registro; por isso o fluxo ficou incompleto.”

## Saída

Responda somente com JSON válido conforme `schemas/judge-result.schema.json`.
