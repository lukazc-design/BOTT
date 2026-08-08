# Arquitetura — OrçaFacil-Frio

Referência de padrões e convenções do projeto. Cole este bloco no system prompt ao iniciar uma nova sessão de desenvolvimento.

---

## Stack & Runtime

- **Next.js 16** com App Router (`app/`). `params`, `searchParams`, `headers()` e `cookies()` são **sempre** `await`ados — assíncronos no Next.js 16.
- **TypeScript** estrito em todo o projeto.
- **Tailwind CSS v4** — sem `tailwind.config.js`. Tokens definidos em `app/globals.css` dentro de `@theme { }`. Nunca usar cores diretas (`text-white`, `bg-black`); sempre via tokens semânticos (`bg-background`, `text-foreground`, `text-primary`, etc.).
- **shadcn/ui** com estilo `new-york`. Componentes em `components/ui/`. Para adicionar novos: `pnpm dlx shadcn@latest add <componente>`.
- **pnpm** como gerenciador de pacotes.
- **Sem banco de dados, sem autenticação, sem pagamentos** — o app é 100% local, dados em `localStorage`.

---

## Armazenamento — localStorage via `lib/storage.ts`

- Todo estado persistido passa por `lib/storage.ts` (funções `carregarPerfil`, `salvarPerfil`, `carregarOrcamentos`, `salvarOrcamento`, `excluirOrcamento`, `atualizarStatusOrcamento`).
- Tipos centrais em `lib/tipos.ts` — `PerfilTecnico`, `Orcamento`, `EquipamentoOrcamento`, `ItemOrcamento`, `TotaisOrcamento`.
- Limite de `MAX_ORCAMENTOS` (15) orçamentos salvos. Verificar antes de salvar.
- `carregarPerfil()` retorna `PERFIL_PADRAO` em SSR (typeof window === 'undefined') — nunca chame storage fora de client components ou sem guard.
- Nunca usar `useEffect` para ler localStorage — usar chamada direta no corpo do componente client ou em handlers de evento.

---

## IA Local — Ollama via `app/api/ollama/`

- `app/api/ollama/route.ts` — verifica se o Ollama está online (`GET /api/tags`).
- `app/api/ollama/chat/route.ts` — recebe `{ mensagem, historico, ollamaUrl, model, estadoAtual }` e devolve `{ resposta, acao }`.
- `estadoAtual` contém os equipamentos já no orçamento — a rota injeta como contexto no prompt para que a IA saiba o que alterar.
- O `SYSTEM_CHAT` define o JSON de saída: `{ acao, clienteNome, equipamentos[], itensExtras[], observacoes }`.
- Quando a IA retorna `acao === 'adicionar'` → faz append nos equipamentos. Qualquer outra ação (`atualizar_orcamento`, `alterar`, `substituir`) → substitui a lista completa.

---

## Cálculo — `lib/motor-calculo.ts`

- `gerarItensEquipamento(eq, perfil)` — gera os `ItemOrcamento[]` a partir de um equipamento e o perfil do técnico (margem de lucro).
- `calcularTotais(itens)` — retorna `TotaisOrcamento` (`totalCusto`, `totalVenda`, `lucro`, `margemLucro`).
- Nunca recalcular manualmente — sempre usar essas funções.
- Dados técnicos de referência (bitolas, disjuntores, preços base) em `lib/dados-tecnicos.ts`.

---

## Geração de PDF — `lib/gerar-pdf.ts`

- `gerarHtmlPdf(orcamento, perfil, versao)` — retorna HTML string pronto para `window.print()`.
- `VersaoPdf`: `'cliente'` | `'interna'` | `'interna-sem-custo'` | `'loja'`.
  - `cliente` — apenas preços de venda, sem custo.
  - `interna` — custo, venda, lucro e margem por item.
  - `interna-sem-custo` — venda, lucro e margem totais, sem revelar custo unitário.
  - `loja` — lista de materiais para cotação com fornecedor (campos de preço em branco).
- Layout `'classico'`: header colorido sólido com cor da empresa, logo, composição do orçamento, equipamentos e tabela de itens agrupada por categoria.
- Exportar via `window.open` + `win.print()` — sem biblioteca externa de PDF.

---

## Estrutura de Pastas

```
app/
  api/
    ollama/
      route.ts          ← status do Ollama
      chat/route.ts     ← chat com IA
  layout.tsx
  page.tsx              ← orquestrador de telas (estado global via useState)
  globals.css           ← tokens Tailwind v4 (@theme)

components/
  layout/
    sidebar.tsx         ← nav desktop
    nav-bottom.tsx      ← nav mobile
  telas/
    landing.tsx         ← configuração inicial / onboarding
    dashboard.tsx       ← resumo e métricas
    novo-orcamento.tsx  ← chat + painel lateral + preview
    historico.tsx       ← lista de orçamentos salvos
    perfil.tsx          ← configurações do técnico
  ui/                   ← shadcn components

lib/
  tipos.ts              ← todos os tipos TypeScript do domínio
  storage.ts            ← localStorage (perfil + orçamentos)
  motor-calculo.ts      ← gerarItensEquipamento, calcularTotais
  dados-tecnicos.ts     ← tabelas de bitola, disjuntor, preços base
  gerar-pdf.ts          ← gerarHtmlPdf (HTML para impressão)
  extrair-cores.ts      ← utilitários de cor (hexToRgb, rgba, corClara)
  utils.ts              ← cn() e helpers gerais
```

---

## Padrões de Código

- **Estado global**: tudo em `app/page.tsx` via `useState`. Telas recebem estado como props + callbacks.
- **Componentes**: dividir em múltiplos arquivos. `page.tsx` importa de `components/telas/`. Componentes grandes (ex: `novo-orcamento.tsx`) divididos em sub-componentes no mesmo arquivo quando são fortemente acoplados.
- **Formatação de moeda**: usar `fmt()` de `lib/motor-calculo.ts` (ou definida localmente como `Intl.NumberFormat BRL`). Nunca formatar moeda manualmente.
- **Ícones**: Lucide React exclusivamente. Tamanhos: 12px, 14px, 16px, 20px ou 24px. Nunca emojis como ícones.
- **Data fetching**: sem SWR (sem servidor). Dados lidos direto do localStorage em client components.
- **Server Actions**: não usadas — app é 100% client-side. Rotas de API apenas para proxy do Ollama.

---

## Design System

- **Fontes**: máximo 2 famílias. Configuradas em `app/layout.tsx` via `next/font/google`.
- **Cores**: 3–5 no total, via tokens em `globals.css`. Cor primária do técnico em `perfil.corPrimaria` (default `#0ea5e9`) — usada inline via `style={{ color: cor }}`.
- **Tema**: dark por padrão. `<html className="bg-background">` em `layout.tsx`.
- **Layout**: flexbox primeiro. Grid só para layouts 2D (ex: cards de métricas). Nunca `float` ou `position: absolute` sem necessidade.
- **Componentes de dados**: `Table` do shadcn para listas tabulares. `Popover + Command` para selects com busca/filtro.
- **Cards de seção**: `rounded-xl border border-border bg-card` com `p-4` ou `p-3`.
- **Badges de status**: `Badge` do shadcn com variantes (`default`, `secondary`, `destructive`, `outline`).

---

## Regras de Segurança (aplicáveis)

- Variáveis sensíveis apenas no servidor — nunca prefixar com `NEXT_PUBLIC_` dados privados.
- `SYSTEM_CHAT` e lógica de parsing do Ollama ficam **somente** em `app/api/ollama/chat/route.ts` (servidor) — nunca expor no cliente.
- Sanitizar input do usuário antes de injetar no prompt do Ollama (evitar prompt injection).
- Headers de segurança em `next.config`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

---

## O que NÃO pertence a este projeto

- Neon / Drizzle ORM / banco de dados → não há backend de dados
- Better Auth / sessões / middleware de proteção de rotas → sem autenticação
- Stripe / pagamentos / webhooks → sem monetização no app
- SWR / React Query → sem servidor de dados
- Zustand / Redux → sem necessidade (estado em page.tsx)
- OAuth / magic links / passkeys → sem auth
