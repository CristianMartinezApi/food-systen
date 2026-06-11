# Hardening da VPS

Checklist enxuto para produção do Food System.

## Sistema

- [ ] Atualizar pacotes do sistema
- [ ] Criar usuário sem privilégio de root
- [ ] Desabilitar login direto por senha no SSH
- [ ] Habilitar autenticação por chave SSH
- [ ] Ativar firewall e liberar só `22`, `80` e `443`
- [ ] Habilitar updates automáticos de segurança

## Docker

- [ ] Rodar containers com `restart: unless-stopped`
- [ ] Manter portas expostas apenas em `127.0.0.1`
- [ ] Usar imagem de banco com volume persistente
- [ ] Remover containers e volumes antigos após testes

## Aplicação

- [ ] Definir `JWT_SECRET` forte
- [ ] Definir `ALLOWED_ORIGINS` com o domínio real
- [ ] Definir `NEXT_PUBLIC_API_URL` com HTTPS
- [ ] Definir `NEXT_PUBLIC_SOCKET_URL` com HTTPS
- [ ] Trocar senhas iniciais após o primeiro login
- [ ] Validar login de `SUPER_ADMIN`

## Banco

- [ ] Usar Postgres gerenciado, se possível
- [ ] Configurar backup diário
- [ ] Testar restore do backup
- [ ] Monitorar espaço em disco

## Observabilidade

- [ ] Habilitar logs do Nginx
- [ ] Guardar logs do Docker
- [ ] Configurar alertas de queda do serviço
- [ ] Revisar uso de CPU, memória e disco semanalmente
