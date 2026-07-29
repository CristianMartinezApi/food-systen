# PIX direto por chave da loja

O FoodSystem usa PIX direto, sem gateway de pagamento e sem webhook bancário.

## Funcionamento

1. Um administrador da loja cadastra e ativa a chave PIX em **Configurações > Pagamento PIX**.
2. No checkout, o sistema gera o QR Code e o código PIX Copia e Cola com o valor do pedido.
3. O pagamento é enviado diretamente para a conta bancária vinculada à chave cadastrada.
4. O cliente pode avisar a loja e enviar o comprovante pelo WhatsApp.
5. A loja confere o recebimento e atualiza o pedido manualmente.

O sistema valida o formato da chave, mas não consulta o DICT do Banco Central. A loja é responsável por cadastrar uma chave ativa e pertencente à conta correta.

## Configuração

Não são necessárias credenciais EFI, segredo de webhook ou chave de API bancária. Os campos do PIX são armazenados por loja no banco de dados.

Ao trocar a chave, faça um pedido de baixo valor e valide:

- nome do recebedor apresentado pelo aplicativo bancário;
- valor codificado no QR Code e no Copia e Cola;
- recebimento na conta esperada;
- conferência manual e atualização do pedido.

## Limitação operacional

Sem webhook, o sistema não confirma pagamentos automaticamente. Um comprovante enviado pelo cliente ajuda na conferência, mas a confirmação final deve ser feita no extrato da conta da loja.
