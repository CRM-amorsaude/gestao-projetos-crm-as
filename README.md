# Sistema de Gestão de Projetos — CRM AmorSaúde

Sistema interno de gestão de tarefas e projetos do time de CRM da AmorSaúde. Centraliza o acompanhamento de demandas, sprints, OKRs e comunicação do time em uma única plataforma.

## Funcionalidades

- **Dashboard** — visão geral das tarefas ativas, em desenvolvimento, em revisão e impedidas
- **Quadro Kanban** — arrastar e soltar tarefas entre colunas de status
- **Backlog + Sprints** — criação e gestão de sprints com controle de status (Planejada / Ativa / Concluída)
- **Lista de Tarefas** — visualização tabular com filtros avançados
- **Planejamento Estratégico** — acompanhamento de OKRs e Key Results por trimestre
- **Notificações em tempo real** — via Supabase Realtime (menções, atribuições, mudanças de status)
- **Gestão de Equipe** — perfis, squads e níveis de acesso (Admin / Editor / Visualizador)
- **Modo escuro**

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript |
| Roteamento | React Router DOM v7 |
| Backend / DB | Supabase (Postgres + Auth + Realtime + Storage) |
| Build | Vite 6 |
| Estilo | Tailwind CSS (CDN) + Material Symbols |

## Rodando localmente

**Pré-requisitos:** Node.js 18+

1. Clone o repositório:
   ```bash
   git clone https://github.com/CRM-amorsaude/gestao-projetos-crm-as.git
   cd gestao-projetos-crm-as
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente — copie o exemplo e preencha:
   ```bash
   cp .env.example .env
   ```

   | Variável | Descrição |
   |----------|-----------|
   | `VITE_SUPABASE_URL` | URL do projeto Supabase |
   | `VITE_SUPABASE_KEY` | Chave pública (anon key) do Supabase |
   | `VITE_ADMIN_EMAIL` | E-mail do usuário com acesso Admin |

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse em `http://localhost:3000`

## Deploy

O deploy é automático via GitHub Actions a cada push na branch `main`. O sistema é publicado no GitHub Pages em:

**https://crm-amorsaude.github.io/gestao-projetos-crm-as/**

Para configurar em um novo repositório, adicione os seguintes secrets em `Settings → Secrets and variables → Actions`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`
- `VITE_ADMIN_EMAIL`

## Acesso

O sistema é exclusivo para e-mails `@amorsaude.com`. O cadastro de novos usuários pode ser feito pela tela de login ou gerenciado pelo Admin em Configurações.
