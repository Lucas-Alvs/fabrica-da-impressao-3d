/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Módulos do Node usados apenas no servidor ficam fora do bundle.
  serverExternalPackages: ["pg"]
};

export default nextConfig;
