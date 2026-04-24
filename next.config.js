/** @type {import('next').NextConfig} */
const nextConfig = {
  // NR-1 é servido como subpath de conexao.abrasel.com.br/nr1
  // O Next.js prefixa automaticamente todos os links internos (<Link>)
  // e rotas de API client-side com este basePath.
  basePath: "/nr1",
}

module.exports = nextConfig
