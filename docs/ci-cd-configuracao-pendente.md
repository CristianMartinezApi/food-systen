# Configuração pendente de CI/CD

Este documento registra o que ainda precisa ser configurado no GitHub e na VPS para ativar o deploy seguro do Food System.

> Não salve chaves privadas, senhas, tokens ou o conteúdo real do `.env` no repositório.

## Estado atual

- Branch de produção: `main`.
- Repositório esperado na VPS: `/root/food-systen`.
- Domínio de produção: `https://foodsystem.app.br`.
- Workflow existente: `.github/workflows/ci-cd.yml`.
- Script principal de publicação: `deploy/deploy.sh`.
- Compose de produção: `deploy/docker-compose.vps.yml`.
- O código do CI/CD já está no GitHub.
- Os Secrets do GitHub ainda não foram configurados.
- O acesso SSH do GitHub Actions à VPS ainda não foi configurado.
- O primeiro deploy com os novos scripts ainda não foi homologado manualmente.

O CI valida pull requests e pushes para `main`, mas o deploy está temporariamente restrito a execuções manuais (`workflow_dispatch`).

## Estratégia recomendada

Ativar a automação em três etapas:

1. Validar CI e testes sem publicar.
2. Preparar a VPS e executar um deploy manual.
3. Configurar o GitHub e liberar o deploy automático com aprovação.

Não ativar o deploy automático antes de concluir e validar o deploy manual.

## Etapa 1 — Ajustar e validar o CI

Antes de liberar a publicação, confirmar que o job `validate` executa:

```bash
# Front-end
cd front-end
npm ci
npm run test:shop-ui
npx tsc --noEmit
npm run build

# Back-end
cd ../back-end
npm ci
npx prisma generate
npm test
npm run build
```

Estado esperado:

- 8 testes de regressão da interface aprovados.
- 14 testes do back-end aprovados.
- TypeScript aprovado.
- Build do front-end aprovado.
- Build do back-end aprovado.

Durante a preparação inicial, é recomendável deixar a publicação disponível somente por `workflow_dispatch`. Depois da homologação, o deploy por `push` na `main` pode ser reativado.

## Etapa 2 — Preparar o acesso SSH

No computador pessoal, crie uma chave exclusiva para o GitHub Actions:

```bash
ssh-keygen -t ed25519 -C "github-actions-food-system" -f ~/.ssh/food_system_actions
```

Serão criados:

```text
~/.ssh/food_system_actions       # chave privada
~/.ssh/food_system_actions.pub   # chave pública
```

Copie somente a chave pública para a VPS:

```bash
ssh-copy-id -i ~/.ssh/food_system_actions.pub -p 22 root@ENDERECO_DA_VPS
```

Se `ssh-copy-id` não estiver disponível, copie o conteúdo de `food_system_actions.pub` para `/root/.ssh/authorized_keys` na VPS.

Garanta as permissões corretas:

```bash
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys
```

Teste a chave a partir do computador pessoal:

```bash
ssh -i ~/.ssh/food_system_actions -p 22 root@ENDERECO_DA_VPS
```

Use outro usuário no lugar de `root` caso a VPS esteja configurada dessa forma. Nesse caso, ajuste também o workflow e o caminho do repositório.

## Etapa 3 — Preparar a VPS

Entre na VPS e confirme os requisitos:

```bash
docker --version
docker compose version
git --version
nginx -v
```

Confirme o projeto:

```bash
cd /root/food-systen
git remote -v
git branch --show-current
git status
```

Resultado esperado: branch `main`, working tree limpo e `origin` correto.

Atualize o código manualmente:

```bash
git fetch origin main
git pull --ff-only origin main
```

O usuário da VPS precisa executar esse `git pull` sem interação. Para repositório privado, configure uma deploy key de leitura ou outra credencial segura no servidor.

## Etapa 4 — Configurar o `.env` de produção

O arquivo deve existir em `/root/food-systen/.env`.

Modelo mínimo:

```env
PORT=8000
NODE_ENV=production

POSTGRES_USER=USUARIO_FORTE
POSTGRES_PASSWORD=SENHA_ALEATORIA_COM_PELO_MENOS_16_CARACTERES
POSTGRES_DB=food_db
DATABASE_URL=postgresql://USUARIO:SENHA@db:5432/food_db

JWT_SECRET=SEGREDO_ALEATORIO_COM_PELO_MENOS_32_CARACTERES

FRONTEND_URL=https://foodsystem.app.br
NEXT_PUBLIC_API_URL=https://foodsystem.app.br/api
NEXT_PUBLIC_SOCKET_URL=https://foodsystem.app.br
ALLOWED_ORIGINS=https://foodsystem.app.br

RESEND_API_KEY=re_SUBSTITUIR
EMAIL_FROM=FoodSystem <noreply@DOMINIO_VERIFICADO>

RATE_LIMIT_MAX=300
LOG_LEVEL=info

INITIAL_ADMIN_PASSWORD=
INITIAL_SUPERADMIN_PASSWORD=
```

Regras importantes:

- `JWT_SECRET`: aleatório e com pelo menos 32 caracteres.
- Senha do PostgreSQL: pelo menos 16 caracteres.
- `RESEND_API_KEY`: deve começar com `re_`.
- O domínio de `EMAIL_FROM` deve estar verificado no Resend.
- URLs públicas devem usar HTTPS.
- Senhas iniciais devem ficar vazias após o provisionamento.
- Execute `chmod 600 .env`.

Para gerar valores aleatórios:

```bash
openssl rand -base64 48
```

## Etapa 5 — Validar Nginx e HTTPS

```bash
sudo nginx -t
sudo systemctl status nginx
sudo certbot certificates
```

Rotas esperadas:

```text
/          -> frontend
/api       -> backend
/socket.io -> backend
```

Teste externamente:

```bash
curl -I https://foodsystem.app.br/
curl -I https://foodsystem.app.br/api
```

## Etapa 6 — Primeiro deploy manual

Confirme que não há mudanças locais na VPS:

```bash
cd /root/food-systen
git status --short
```

Execute:

```bash
bash deploy/preflight.sh
bash deploy/deploy.sh
```

O deploy:

1. Valida ambiente e Compose.
2. Compila as imagens.
3. Inicia e aguarda o PostgreSQL.
4. Cria e valida um backup.
5. Executa `prisma migrate deploy`.
6. Atualiza os containers.
7. Verifica a saúde do back-end.

Nunca execute em produção:

```bash
npx prisma migrate reset --force
```

## Etapa 7 — Verificação pós-deploy

Na VPS:

```bash
docker compose --env-file .env -f deploy/docker-compose.vps.yml ps
docker compose --env-file .env -f deploy/docker-compose.vps.yml logs --tail=100 backend
docker compose --env-file .env -f deploy/docker-compose.vps.yml logs --tail=100 frontend
curl --fail http://127.0.0.1:8000/health/ready
```

Externamente:

```bash
curl --fail --show-error https://foodsystem.app.br/
```

Homologação manual:

- Abrir o cardápio de uma loja.
- Conferir banner, logo, status e categorias.
- Adicionar, editar e remover produto do carrinho.
- Simular checkout até a revisão.
- Abrir “Meus pedidos”.
- Testar login administrativo.
- Conferir pedidos e caixa no painel.

## Etapa 8 — Configurar o GitHub

Crie o environment:

```text
Settings -> Environments -> New environment -> production
```

Configuração recomendada:

- Required reviewers habilitado.
- Branch de deployment restrito à `main`.
- Sem bypass das regras de proteção.

Adicionar no environment `production` ou em Actions Secrets:

```text
VPS_SSH_HOST
VPS_SSH_PORT
VPS_SSH_USER
VPS_SSH_PRIVATE_KEY
VPS_SSH_KNOWN_HOSTS
```

Significado:

- `VPS_SSH_HOST`: IP ou hostname, sem protocolo.
- `VPS_SSH_PORT`: normalmente `22`.
- `VPS_SSH_USER`: usuário autorizado.
- `VPS_SSH_PRIVATE_KEY`: conteúdo completo de `~/.ssh/food_system_actions`.
- `VPS_SSH_KNOWN_HOSTS`: saída validada do `ssh-keyscan`.

Gerar `known_hosts`:

```bash
ssh-keyscan -p 22 ENDERECO_DA_VPS
```

Compare a fingerprint com a obtida diretamente na VPS antes de salvar o Secret.

## Etapa 9 — Testar o workflow manualmente

No GitHub:

```text
Actions -> CI/CD -> Run workflow -> main
```

Fluxo esperado:

```text
validate -> aprovação do environment -> deploy -> validação pública
```

Durante o teste, acompanhe a VPS:

```bash
cd /root/food-systen
docker compose --env-file .env -f deploy/docker-compose.vps.yml logs -f backend frontend
```

## Etapa 10 — Ativar deploy automático

Somente depois de um workflow manual aprovado:

- Manter CI em pull requests e pushes para `main`.
- Liberar o deploy em pushes para `main`.
- Preservar aprovação do environment `production` nas primeiras publicações.

## Rollback

Preferencialmente, crie uma reversão auditável:

```bash
git revert HASH_DO_COMMIT_PROBLEMATICO
git push origin main
```

Depois, na VPS:

```bash
cd /root/food-systen
git fetch origin main
git pull --ff-only origin main
bash deploy/deploy.sh
```

Se houver problema de dados, não improvise rollback de migration. Interrompa a publicação e use o backup validado em `backups/` conforme `deploy/restore.sh` e a documentação de proteção de dados.

## Checklist para retomar em casa

### GitHub

- [x] Atualizar o CI para executar `test:shop-ui` e `npm test`.
- [x] Deixar o primeiro deploy somente manual.
- [ ] Criar environment `production`.
- [ ] Configurar required reviewer.
- [ ] Adicionar os cinco Secrets de SSH.
- [ ] Restringir o environment à branch `main`.

### VPS

- [x] Confirmar Docker, Compose, Git, Nginx e Certbot.
- [x] Confirmar projeto em `/root/food-systen`.
- [x] Confirmar `git pull --ff-only` sem interação.
- [x] Criar chave exclusiva do GitHub Actions.
- [x] Adicionar chave pública em `authorized_keys`.
- [x] Revisar `.env` e permissões.
- [x] Executar `deploy/preflight.sh`.
- [x] Executar `deploy/deploy.sh` manualmente.
- [x] Confirmar backup criado e validado.
- [x] Confirmar migrations.
- [x] Validar containers, logs e health check.
- [ ] Homologar os fluxos críticos.

### Automação

- [ ] Executar workflow manual.
- [ ] Aprovar o environment.
- [ ] Confirmar validação pública do domínio.
- [ ] Monitorar logs após o deploy.
- [ ] Somente então habilitar deploy automático na `main`.

## Arquivos relacionados

- `.github/workflows/ci-cd.yml`
- `deploy/preflight.sh`
- `deploy/deploy.sh`
- `deploy/backup.sh`
- `deploy/restore.sh`
- `deploy/docker-compose.vps.yml`
- `deploy/nginx.conf`
- `docs/vps-deploy.md`
- `docs/vps-hardening.md`
- `docs/deployment/DATA-PROTECTION.md`
