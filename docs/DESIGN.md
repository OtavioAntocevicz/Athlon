# Guia visual — ATHLON

Referência rápida para manter consistência no PWA (`apps/frontend`). Tokens em `apps/frontend/tailwind.config.js`.

## Cores

| Token | Uso |
|-------|-----|
| `background` `#FDF8F3` | Fundo geral |
| `primary` `#5C3D2E` | Texto principal, botões primários |
| `accent` `#E8B84A` | Destaques, professor, CTAs secundários |
| `accent-strong` `#96661F` | Texto sobre fundo claro dourado |
| `destructive` | Erros, badge de pendências |
| `success` | Confirmações, pagamento ok |
| `muted` | Fundos de skeleton, chips |

## Tipografia

- Família: **Inter** (carregada em `index.html`)
- Títulos de página: `text-2xl font-bold text-primary`
- Subtítulo: `text-sm text-muted-foreground`
- Labels de formulário: `text-sm font-medium`

## Espaçamento e layout

- Largura mobile: `max-w-mobile` (430px); em telas grandes o `AppShell` expande até `max-w-2xl`
- Conteúdo: `px-4`, seção `mt-4` / `mt-6`, listas `space-y-3`
- Nav inferior: `pb-24` no `main`
- Cards: `rounded-xl`, `shadow-brand-card`, toque `active:scale-[0.99]`

## Componentes padrão

| Componente | Quando usar |
|------------|-------------|
| `PageHeader` | Título + subtítulo de tela |
| `PageEnter` | Entrada suave após carregar |
| `EmptyState` | Lista vazia com CTA |
| `ListSkeleton` | Loading de listas |
| `QueryError` | Falha de API com retry |
| `SegmentedTabs` | Abas locais (ex.: turma) |
| `OtpInput` | Códigos de 6 dígitos |
| `Toast` | Feedback de cópia / sucesso |

## Padrão de lista (admin e app)

1. `useQuery` com `isLoading`, `isError`, `error`, `refetch`
2. Loading → `ListSkeleton`
3. Erro → `QueryError`
4. Vazio → `EmptyState`
5. Dados → cards ou grid `lg:grid-cols-2` no admin
