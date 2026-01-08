# Connect Repository Design

## Overview

Implementar página para conectar repositorios desde GitHub, GitLab y Bitbucket usando OAuth separado del login. El usuario puede hacer login con cualquier provider pero conecta específicamente cada git provider para importar repos.

## Decisiones de Diseño

- **OAuth separado**: Login es independiente de las conexiones de repos
- **UI**: Página dedicada `/w/[slug]/connect` con cards por provider
- **Selección**: Combobox con búsqueda (estilo Claude Code)
- **MVP**: Solo repo + branch, env vars después en settings
- **Repos privados**: OAuth scopes (`repo` para GitHub), sin GitHub App
- **Cards con estado**: Connected muestra combobox, disconnected muestra botón Connect

## Arquitectura de Datos

### Nueva tabla: `git_connections`

```typescript
export const gitConnections = pgTable(
  "git_connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // github | gitlab | bitbucket
    providerAccountId: text("provider_account_id").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at"),
    scopes: text("scopes"),
    connectedAt: timestamp("connected_at").defaultNow().notNull(),
  },
  (table) => [
    index("gitConnections_userId_idx").on(table.userId),
    uniqueIndex("gitConnections_userId_provider_uidx").on(table.userId, table.provider),
  ]
);
```

Esta tabla es independiente de `accounts` (Better-Auth login). Un usuario puede hacer login con Google pero tener conectado GitHub para repos.

## API Routes

```
/api/git/connect/[provider]      → Inicia OAuth (redirect a GitHub/GitLab/Bitbucket)
/api/git/callback/[provider]     → Callback OAuth, guarda token en git_connections
/api/git/connections             → GET: lista conexiones del usuario
/api/git/connections/[provider]  → DELETE: desconectar provider
/api/git/[provider]/repos        → GET: lista repos del usuario
/api/git/[provider]/branches     → GET: lista branches de un repo
```

## OAuth Flow

1. Usuario hace click en "Connect GitHub"
2. Redirect a `/api/git/connect/github`
3. Server genera `state` token, guarda en cookie, redirect a GitHub
4. GitHub callback a `/api/git/callback/github`
5. Server valida `state`, intercambia code por token, guarda en `git_connections`
6. Redirect a `/w/[slug]/connect?provider=github&status=success`
7. UI muestra el combobox de repos

### OAuth Scopes por Provider

| Provider   | Scopes                      |
|------------|----------------------------|
| GitHub     | `repo, read:user`          |
| GitLab     | `read_repository, read_user`|
| Bitbucket  | `repository, account`      |

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard          Connect a Repository             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌───────────┐ │
│  │  ◉ GitHub           │ │  ◎ GitLab           │ │ ◎ Bitbucket│ │
│  │                     │ │                     │ │            │ │
│  │  ┌───────────────┐  │ │                     │ │            │ │
│  │  │ Search repos▾ │  │ │   [Connect GitLab]  │ │ [Connect]  │ │
│  │  └───────────────┘  │ │                     │ │            │ │
│  │  ┌───────────────┐  │ │                     │ │            │ │
│  │  │ Branch: main▾ │  │ │                     │ │            │ │
│  │  └───────────────┘  │ │                     │ │            │ │
│  │                     │ │                     │ │            │ │
│  │  [Import Project]   │ │                     │ │            │ │
│  └─────────────────────┘ └─────────────────────┘ └───────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Estados de Provider Card

1. **Disconnected** - Muestra botón "Connect {Provider}"
2. **Connecting** - Loading mientras OAuth
3. **Connected** - Muestra combobox de repos + branch select + botón "Import"

## Componentes

```
features/git-providers/
├── components/
│   ├── provider-card.tsx      # Card con estado connected/disconnected
│   ├── repo-combobox.tsx      # Combobox con búsqueda de repos
│   └── branch-select.tsx      # Select de branches
├── lib/
│   ├── github.ts              # GitHub API client
│   ├── gitlab.ts              # GitLab API client
│   └── bitbucket.ts           # Bitbucket API client
├── hooks/
│   ├── use-connections.ts     # SWR hook para conexiones
│   └── use-repos.ts           # SWR hook para repos
└── index.ts
```

## Estructura de Archivos

```
src/
├── app/
│   ├── api/
│   │   └── git/
│   │       ├── connect/[provider]/route.ts
│   │       ├── callback/[provider]/route.ts
│   │       ├── connections/
│   │       │   ├── route.ts
│   │       │   └── [provider]/route.ts
│   │       └── [provider]/
│   │           ├── repos/route.ts
│   │           └── branches/route.ts
│   │
│   └── w/[workspaceSlug]/
│       └── connect/
│           └── page.tsx
│
├── features/
│   └── git-providers/
│       ├── components/
│       ├── lib/
│       ├── hooks/
│       └── index.ts
│
└── db/
    └── schema.ts              # + git_connections table
```

## Implementación

### Fase 1: Database + OAuth Flow
- [ ] Agregar tabla `git_connections` al schema
- [ ] Crear `/api/git/connect/[provider]` (GitHub primero)
- [ ] Crear `/api/git/callback/[provider]`
- [ ] Crear `/api/git/connections` GET

### Fase 2: Provider APIs
- [ ] Implementar GitHub API client (repos, branches)
- [ ] Crear `/api/git/github/repos`
- [ ] Crear `/api/git/github/branches`

### Fase 3: UI Components
- [ ] Crear `ProviderCard` component
- [ ] Crear `RepoCombobox` con búsqueda
- [ ] Crear `BranchSelect`
- [ ] Crear página `/w/[slug]/connect`

### Fase 4: Import Flow
- [ ] Conectar UI con POST `/api/repositories`
- [ ] Redirect a dashboard después de import
- [ ] Mostrar repo en sidebar

### Fase 5: GitLab + Bitbucket (después del MVP)
- [ ] GitLab OAuth + API client
- [ ] Bitbucket OAuth + API client

## Environment Variables

```bash
# GitHub (ya existentes, agregar scopes en app config)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# GitLab (nuevo)
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=

# Bitbucket (nuevo)
BITBUCKET_CLIENT_ID=
BITBUCKET_CLIENT_SECRET=
```

## Notas Futuras

- **Vercel Integration**: Las cards escalan bien para agregar Vercel como provider de deploy
- **Webhooks**: Considerar agregar webhooks para sync automático de cambios
- **GitHub App**: Si se necesita más control de permisos, migrar a GitHub App
