# Onboarding Completo - Design Document

**Date:** 2026-01-08
**Status:** Approved

## Overview

Implementar flujo de onboarding completo para nuevos usuarios, guiándolos desde el registro hasta su primera sesión de trabajo con Quick Actions.

## Flujo de Onboarding (3 pasos)

```
REGISTRO (/register)
       ↓
  (crear cuenta exitoso)
       ↓
┌─────────────────────────────────────────────────────────────────┐
│              PASO 1: CONECTAR PROVIDER                          │
│              /onboarding/connect                                │
│                                                                 │
│  "Conecta tu código"                                            │
│  "Elige donde está tu repositorio"                              │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   GitHub    │  │   GitLab    │  │  Bitbucket  │             │
│  │     🔗      │  │     🔗      │  │     🔗      │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  (mínimo 1 provider conectado para continuar)                   │
│                                [Continuar →]                    │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│              PASO 2: SELECCIONAR REPO                           │
│              /onboarding/select-repo                            │
│                                                                 │
│  "¿En qué proyecto vas a trabajar?"                             │
│                                                                 │
│  [🔍 Buscar repositorio...          ▼]                          │
│                                                                 │
│  Repos encontrados:                                             │
│  ○ org/frontend-app         main                                │
│  ● org/backend-api          main    ← seleccionado             │
│  ○ org/mobile-app           develop                             │
│                                                                 │
│                                [Empezar a construir →]          │
└─────────────────────────────────────────────────────────────────┘
       ↓
WORKSPACE CON QUICK ACTIONS (/w/[workspaceSlug])
```

## Quick Actions y Empty States

Cuando el usuario llega al workspace después del onboarding:

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] LumLabs        [org/backend-api ▼] [main ▼]      [Avatar ▼] │
├────────────────┬────────────────────────────────────────────────────┤
│                │                                                    │
│   SIDEBAR      │  ¡Bienvenido! 👋                                   │
│                │  Describe lo que quieres construir                 │
│   Sessions     │                                                    │
│   (vacío)      │  ┌────────────────────────────────────────────┐   │
│                │  │                                            │   │
│   ─────────    │  │  ¿Qué te gustaría hacer hoy?               │   │
│                │  │                                            │   │
│   [Settings]   │  │  ┌──────────────┐  ┌──────────────┐       │   │
│                │  │  │ 🎨 Cambiar   │  │ ✨ Agregar   │       │   │
│                │  │  │  algo en     │  │  una nueva   │       │   │
│                │  │  │  la UI       │  │  feature     │       │   │
│                │  │  └──────────────┘  └──────────────┘       │   │
│                │  │                                            │   │
│                │  │  ┌──────────────┐  ┌──────────────┐       │   │
│                │  │  │ 🐛 Arreglar  │  │ 📖 Explicame │       │   │
│                │  │  │  un problema │  │  como        │       │   │
│                │  │  │              │  │  funciona    │       │   │
│                │  │  └──────────────┘  └──────────────┘       │   │
│                │  │                                            │   │
│                │  │  ┌──────────────────────────────────────┐ │   │
│                │  │  │ O describe directamente...        ↵ │ │   │
│                │  │  └──────────────────────────────────────┘ │   │
│                │  │                                            │   │
│                │  └────────────────────────────────────────────┘   │
│                │                                                    │
└────────────────┴────────────────────────────────────────────────────┘
```

### Comportamiento de Quick Actions

- Click en card → abre input con prefijo contextual
  - "Cambiar UI" → "Quiero modificar..."
  - "Agregar feature" → "Quiero agregar..."
  - "Arreglar problema" → "Hay un problema con..."
  - "Explicame" → "Explicame cómo funciona..."
- Al enviar mensaje → crea sesión automáticamente
- Sesión aparece en sidebar y se abre como tab activa

### Empty State del Sidebar

```
Sessions
─────────
No hay sesiones aún.
Empieza describiendo lo que
quieres construir.
```

## Modelo de Datos

### Nueva tabla: `onboarding_state`

```sql
onboarding_state (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  step TEXT DEFAULT 'connect',  -- connect | select-repo | completed
  default_repository_id TEXT REFERENCES repositories(id),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

## Estructura de Archivos

```
src/
├── app/
│   └── onboarding/
│       ├── layout.tsx           # Layout minimalista (logo + progress)
│       ├── connect/
│       │   └── page.tsx         # Paso 1: conectar providers
│       └── select-repo/
│           └── page.tsx         # Paso 2: seleccionar repo
│
├── features/
│   └── onboarding/
│       ├── components/
│       │   ├── onboarding-progress.tsx    # Indicador 1/2, 2/2
│       │   ├── provider-connect-card.tsx  # Card de GitHub/GitLab/etc
│       │   ├── repo-selector.tsx          # Combobox de repos
│       │   └── quick-actions.tsx          # Cards de acciones rápidas
│       ├── hooks/
│       │   └── use-onboarding.ts          # Estado y navegación
│       └── index.ts
```

## Lógica de Redirección

```
/ (root)
  ├── No autenticado → /login
  ├── Autenticado + onboarding incompleto → /onboarding/connect
  └── Autenticado + onboarding completo → /w/[workspaceSlug]
```

### Detalle de estados:

- `step = 'connect'` → Sin providers conectados → `/onboarding/connect`
- `step = 'select-repo'` → Con provider pero sin repo default → `/onboarding/select-repo`
- `step = 'completed'` → Todo listo → `/w/[workspaceSlug]`

## Fases de Implementación

### Fase 1: Schema y Redirección
- [ ] Agregar tabla `onboarding_state` al schema
- [ ] Crear hook `useOnboarding` para gestionar estado
- [ ] Modificar página root `/` para redirigir según estado
- [ ] Modificar `email-form.tsx` para redirigir a onboarding

### Fase 2: Páginas de Onboarding
- [ ] Crear layout `/onboarding/layout.tsx` con progress indicator
- [ ] Crear `/onboarding/connect/page.tsx` con provider cards
- [ ] Crear `/onboarding/select-repo/page.tsx` con repo selector
- [ ] Reutilizar componentes existentes de git-providers

### Fase 3: Quick Actions
- [ ] Crear componente `QuickActions` con las 4 cards
- [ ] Integrar en workspace dashboard
- [ ] Conectar con creación de sesión al enviar mensaje
- [ ] Actualizar empty state del sidebar

### Fase 4: Polish
- [ ] Animaciones de transición entre pasos
- [ ] Loading states durante OAuth y fetch de repos
- [ ] Error handling con mensajes claros
- [ ] Skip onboarding para usuarios existentes
