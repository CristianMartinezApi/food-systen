import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';

// Este módulo é importado antes de tudo em index.ts (pra capturar erros o mais
// cedo possível), então precisa carregar o .env por conta própria — o
// dotenv.config() de index.ts ainda não rodou nesse ponto.
dotenv.config();

const dsn = process.env.SENTRY_DSN;

export const sentryEnabled = Boolean(dsn);

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.1,
  });

  // A maioria das rotas já captura o próprio erro com try/catch e console.error
  // em vez de repassar pro Express (next(err)). Em vez de reescrever centenas de
  // pontos de captura no monolito, interceptamos console.error aqui para também
  // reportar ao Sentry — cobertura ampla sem tocar em cada rota individualmente.
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    originalConsoleError(...args);
    const errorArg = args.find((arg): arg is Error => arg instanceof Error);
    if (errorArg) {
      Sentry.captureException(errorArg);
    } else {
      const message = args
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ');
      Sentry.captureMessage(message, 'error');
    }
  };
}

export { Sentry };
