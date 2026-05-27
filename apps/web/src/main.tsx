import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { seedDatabase } from './core/services/seed.service'

// Inicializar banco de dados de forma segura
seedDatabase().catch(err => console.error("Database seed failed:", err));

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
