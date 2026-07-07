/** @type {import('next').NextConfig} */
import path from "path";
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd(), ".."),
};
export default nextConfig;
