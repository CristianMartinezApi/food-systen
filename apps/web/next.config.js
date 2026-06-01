/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Atenção: Isso permite que o build continue mesmo que haja erros de ESLint.
    // Ideal para migrações rápidas, mas deve ser corrigido depois.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Mesma lógica para o TypeScript durante a migração do framework.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
