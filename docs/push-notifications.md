# Notificação de status de pedido ao cliente (Push Web)

O cliente final é avisado de mudanças no pedido por notificação push do navegador —
não por e-mail (e-mail via Resend fica só para avisos internos/administrativos:
verificação de conta, reset de senha, lembretes de caixa).

## Funcionamento

1. Na tela de sucesso do pedido ou em "Meus pedidos", o cliente pode ativar
   notificações (botão "Avisar quando o status mudar").
2. O navegador pede permissão nativa e registra um service worker
   (`front-end/public/sw.js`).
3. A inscrição (endpoint + chaves do navegador) é enviada para
   `POST /api/push/subscribe`, autenticada pelo mesmo par `phone` + `accessToken`
   já emitido na criação do pedido — não é um login novo.
4. O backend dispara push (`back-end/src/services/PushService.ts`) ao criar o
   pedido e a cada mudança de status relevante (confirmado, em preparo, pronto,
   saiu para entrega, entregue/retirado, cancelado, estornado).

## Configuração (chaves VAPID)

Sem isso, o sistema funciona normalmente — só não envia push. Gerar o par uma única
vez:

```bash
cd back-end
npx web-push generate-vapid-keys
```

Adicionar ao `.env` de cada app:

```env
# back-end/.env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:contato@seu-dominio.com

# front-end/.env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   # mesma chave publica do backend
```

A chave pública é segura para expor no cliente — é assim que o protocolo Web Push
funciona. Nunca commitar a chave privada.

## Limitações conhecidas

- Sem suporte a WhatsApp/SMS — não há credenciais de provedor terceiro configuradas.
- Se o cliente negar a permissão do navegador, não há novo prompt automático (padrão
  do navegador); ele precisa reativar manualmente nas configurações do site.
- iOS Safari tem suporte a Web Push mais recente e mais restrito (exige o site
  instalado como PWA na tela de início em versões mais antigas).
