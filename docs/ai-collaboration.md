# Codex e Claude Code no mesmo projeto

O repositório usa `AGENTS.md` como fonte única das instruções técnicas e operacionais. O `CLAUDE.md` importa esse arquivo, portanto as regras comuns devem ser alteradas apenas em `AGENTS.md`.

## Configuração no VS Code

Abra a raiz `food-systen`, não apenas `front-end/` ou `back-end/`. Assim os agentes recebem o contexto do repositório inteiro e encontram os arquivos de instrução da raiz.

Antes da primeira sessão em cada ferramenta:

1. Confirme que o Codex reconheceu o `AGENTS.md`.
2. No Claude Code, execute `/memory` e confirme que `CLAUDE.md` e o `AGENTS.md` importado aparecem carregados.
3. Inicie cada tarefa com objetivo, área permitida e critério de aceite claros.
4. Peça sempre um resumo de arquivos alterados e verificações executadas.

Configurações e preferências pessoais devem ficar na configuração global/local de cada ferramenta, fora do Git. Regras que toda a equipe precisa seguir pertencem ao `AGENTS.md`.

## Trabalho simultâneo seguro

Dois agentes editando o mesmo worktree compartilham arquivos e índice Git, o que facilita sobrescritas e mistura de diffs. A forma recomendada é um worktree por tarefa/agente.

Exemplo, executado a partir do repositório principal:

```powershell
git worktree add ..\food-systen-codex -b agent/codex-tarefa
git worktree add ..\food-systen-claude -b agent/claude-tarefa
```

Abra cada pasta em uma janela separada do VS Code. Dê a cada agente uma tarefa independente e evite que ambos alterem os mesmos contratos, migrations ou arquivos centrais. Depois de revisar e testar cada branch, integre uma por vez na branch de destino.

Não use dois agentes em paralelo para mudanças acopladas no mesmo fluxo, como schema + API + tela. Nesses casos, atribua o fluxo completo a um agente ou trabalhe sequencialmente.

## Divisão prática de tarefas

Boas tarefas paralelas:

- implementação em uma área e documentação independente;
- backend de uma feature e investigação sem escrita em outra área;
- criação de testes para comportamento já estabilizado e ajuste visual em arquivos distintos.

Tarefas que devem ser serializadas:

- duas mudanças em `back-end/src/index.ts`;
- qualquer combinação que altere o mesmo endpoint ou tipo compartilhado;
- migrations Prisma concorrentes;
- mudanças simultâneas em lockfiles;
- deploy, restauração ou operações sobre banco/volumes.

## Protocolo de passagem

Ao trocar uma tarefa de agente, registre no prompt:

- objetivo e critério de aceite;
- branch/worktree usado;
- arquivos já alterados;
- decisões tomadas e alternativas rejeitadas;
- comandos executados e resultado;
- pendências e riscos conhecidos.

O diff e os testes são a evidência; o histórico de conversa é apenas contexto auxiliar.
