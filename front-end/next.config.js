/** @type {import('next').NextConfig} */
import path from "path";

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd(), ".."),
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
