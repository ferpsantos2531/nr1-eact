# NR-1 Abrasel — Guia de Deploy (AWS + Conexão Abrasel SSO)

> Branch: `sso-integration`  
> Destino: `conexao.abrasel.com.br/nr1`

---

## 1. Pré-requisitos

- Node.js 20+
- PostgreSQL 15+ (Neon, RDS, ou self-hosted)
- Acesso ao servidor onde `conexao.abrasel.com.br` está hospedado
- Proxy reverso (Nginx, Caddy ou ALB) configurado no servidor

---

## 2. Obter o código

```bash
git clone https://github.com/ferpsantos2531/nr1-eact.git
cd nr1-eact
git checkout sso-integration
npm install
```

---

## 3. Banco de dados

### Opção A — Usar o banco Neon já criado (mais rápido)

O banco do branch SSO já está provisionado no Neon com o schema correto.
Solicite ao Fernando as credenciais do branch `sso-integration`.

### Opção B — Criar banco próprio (PostgreSQL)

```bash
# 1. Criar o banco
createdb nr1_producao

# 2. Aplicar o schema (arquivo gerado pelo Prisma)
psql nr1_producao < prisma/schema.sql

# 3. Ou usar o Prisma diretamente (recomendado)
npx prisma db push
```

> O arquivo `prisma/schema.sql` contém todos os CREATE TABLE necessários.

---

## 4. Variáveis de ambiente

Criar o arquivo `.env` na raiz do projeto:

```env
# ── Banco de dados ─────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:senha@host/nr1?sslmode=require"
DIRECT_URL="postgresql://user:senha@host-direto/nr1?sslmode=require"
# DIRECT_URL é para conexão direta (sem pooler) — necessário para migrations

# ── JWT ────────────────────────────────────────────────────────────────────
# Gerar com: openssl rand -base64 32
JWT_SECRET="gerar-string-aleatoria-forte-aqui-minimo-32-chars"

# ── Claude / Anthropic ─────────────────────────────────────────────────────
ANTHROPIC_API_KEY="sk-ant-..."

# ── URLs ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="https://conexao.abrasel.com.br/nr1"

# ── Integração SSO com Conexão Abrasel ─────────────────────────────────────
CONEXAO_API_URL="https://conexao.abrasel.com.br/perfil/api"
CONEXAO_REDIRECT_URL="https://conexao.abrasel.com.br/entrar"
```

> **Importante:** `JWT_SECRET` deve ser uma string nova e segura. Nunca reutilizar a de desenvolvimento.

---

## 5. Build e start

```bash
# Build de produção
npm run build

# Iniciar
npm start
# Ou com PM2:
pm2 start npm --name "nr1" -- start
```

O servidor sobe na porta `3000` por padrão.

---

## 6. Proxy reverso — rotear `/nr1` para o NR-1

O NR-1 precisa estar acessível em `conexao.abrasel.com.br/nr1`.
O proxy no servidor do Conexão deve encaminhar todas as requisições `/nr1/*` para o processo NR-1.

### Nginx

```nginx
# Adicionar dentro do server block do Conexão
location /nr1 {
    proxy_pass         http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection 'upgrade';
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

### Caddy

```caddyfile
handle /nr1* {
    reverse_proxy localhost:3000
}
```

> **Por que funciona sem CORS:** o NR-1 em `/nr1` é servido pelo mesmo domínio
> (`conexao.abrasel.com.br`), então o cookie `next-auth.session-token` do Conexão
> trafega automaticamente — sem nenhuma configuração adicional no lado do Conexão.

---

## 7. Criar o primeiro administrador

Após o deploy, criar o usuário admin da plataforma NR-1:

```bash
npm run create-admin -- --email admin@abrasel.com.br --senha "SenhaForte123!"
```

Acesse o painel em: `https://conexao.abrasel.com.br/nr1/admin/login`

---

## 8. Como funciona o SSO (para o programador entender)

```
Usuário acessa conexao.abrasel.com.br/nr1
    ↓
Middleware NR-1 verifica: existe cookie nr1_session?
    → SIM: acessa normalmente
    → NÃO: verifica next-auth.session-token (cookie do Conexão — mesmo domínio)
         → VÁLIDO: chama /nr1/api/auth/sso
                   → valida na API do Conexão
                   → cria registro mínimo no banco NR-1
                   → emite nr1_session (8h)
                   → redireciona para o destino original
         → INVÁLIDO: redireciona para conexao.abrasel.com.br/entrar
```

**O questionário** (`/nr1/pesquisa/<token>`) é **público** — funcionários preenchem sem login.

**O painel admin** (`/nr1/admin`) usa autenticação local (tabela `Admin`) — **independente do SSO**.

---

## 9. O que o time do Conexão NÃO precisa fazer

Ao contrário do que pode parecer, **não é necessário nenhuma mudança no lado do Conexão** para o SSO funcionar:

- ✅ O cookie `next-auth.session-token` já trafega para `/nr1` (mesmo domínio)
- ✅ Sem CORS (mesma origem)
- ✅ Sem mudança de configuração de cookies
- ✅ Sem OAuth, sem fluxo de redirecionamento complexo

O único pedido ao time do Conexão é confirmar que os endpoints abaixo estão acessíveis server-side com o cookie de sessão:

```
GET https://conexao.abrasel.com.br/perfil/api/user
GET https://conexao.abrasel.com.br/perfil/api/company
GET https://conexao.abrasel.com.br/perfil/api/company/{id}  (opcional, para nome no questionário)
```

---

## 10. Checklist de deploy

- [ ] Código do branch `sso-integration` clonado
- [ ] `npm install` executado
- [ ] Arquivo `.env` criado com todas as variáveis
- [ ] Banco de dados provisionado (schema aplicado com `prisma db push`)
- [ ] `npm run build` sem erros
- [ ] Processo iniciado (PM2, systemd, ECS, etc.)
- [ ] Proxy reverso configurado: `/nr1/*` → `localhost:3000`
- [ ] Acessar `https://conexao.abrasel.com.br/nr1` — deve redirecionar para login do Conexão
- [ ] Logar no Conexão e acessar `https://conexao.abrasel.com.br/nr1` — deve entrar no dashboard
- [ ] Admin criado com `npm run create-admin`
- [ ] Acessar `https://conexao.abrasel.com.br/nr1/admin/login` com as credenciais admin

---

## 11. Estrutura do banco (resumo)

O banco NR-1 é intencionalmente mínimo — dados de usuário e empresa ficam no Conexão.

| Tabela | O que armazena |
|--------|---------------|
| `Usuario` | ID do Conexão → `isAdmin` (mapeamento de permissão) |
| `Empresa` | ID do Conexão → `surveyToken` (token do questionário) |
| `Admin` | Email + senha (admins Abrasel — auth local, independente do SSO) |
| `Resposta` | Respostas dos funcionários ao questionário |
| `Relatorio` | Relatórios gerados pela IA para cada empresa |

---

## 12. Variáveis para AWS Secrets Manager

Se usar AWS, criar os secrets:

```
/nr1/production/DATABASE_URL
/nr1/production/DIRECT_URL
/nr1/production/JWT_SECRET
/nr1/production/ANTHROPIC_API_KEY
/nr1/production/NEXT_PUBLIC_APP_URL
/nr1/production/CONEXAO_API_URL
/nr1/production/CONEXAO_REDIRECT_URL
```

---

*Dúvidas: entrar em contato com Fernando Santos / equipe NR-1 Abrasel*
