import { Resend } from 'resend';

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  const resend = getResendClient();
  if (!resend) {
    console.warn('RESEND_API_KEY not configured - email not sent');
    return null;
  }

  try {
    const response = await resend.emails.send({
      from: 'noreply@foodsystem.app.br',
      to,
      subject,
      html,
    });

    console.log(`Email sent to ${to}:`, response);
    return response;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}

export function getCashierReminderEmail(restaurantName: string, openTime: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5;">
      <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">⏰ Horário de Abertura!</h1>
          <p style="margin: 0; font-size: 16px; opacity: 0.9;">Sua loja abre em 10 minutos</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px 20px;">
          <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px;">
            Olá,
          </p>
          
          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <p style="margin: 0; color: #1e40af; font-size: 15px;">
              <strong>${restaurantName}</strong> abrirá às <strong>${openTime}</strong>
            </p>
          </div>

          <p style="margin: 0 0 15px 0; color: #374151; font-size: 15px; line-height: 1.6;">
            É hora de preparar a Sessão de Caixa e começar a receber pedidos online. Abra o caixa agora para que seus clientes possam fazer seus pedidos.
          </p>

          <p style="margin: 0 0 25px 0; color: #6b7280; font-size: 14px;">
            💡 <strong>Dica:</strong> Com o caixa aberto, você garante que 100% das vendas sejam registradas no financeiro do sistema.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="https://foodsystem.app.br/admin/caixa" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.3s;">
              Abrir Sessão de Caixa
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 15px; border-radius: 4px; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
              <strong>FoodSystem</strong> | Sistema de Gerenciamento de Restaurantes
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              Suporte: support@foodsystem.app.br
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getCashierNeededEmail(restaurantName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5;">
      <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">⚠️ Ação Necessária</h1>
          <p style="margin: 0; font-size: 16px; opacity: 0.9;">Cliente tentou fazer pedido</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px 20px;">
          <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px;">
            Olá,
          </p>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <p style="margin: 0; color: #b91c1c; font-size: 15px;">
              Um cliente tentou fazer um pedido em <strong>${restaurantName}</strong>, mas a Sessão de Caixa está fechada.
            </p>
          </div>

          <p style="margin: 0 0 15px 0; color: #374151; font-size: 15px; line-height: 1.6;">
            Sem a Sessão de Caixa aberta, os clientes não conseguem fazer pedidos online. Isso significa que você está perdendo vendas em tempo real.
          </p>

          <p style="margin: 0 0 25px 0; color: #6b7280; font-size: 14px;">
            ⚡ <strong>Impacto:</strong> Cada pedido não registrado é receita não capturada no financeiro do sistema.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="https://foodsystem.app.br/admin/caixa" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.3s;">
              Abrir Caixa Agora
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 15px; border-radius: 4px; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
              <strong>FoodSystem</strong> | Sistema de Gerenciamento de Restaurantes
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              Suporte: support@foodsystem.app.br
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
