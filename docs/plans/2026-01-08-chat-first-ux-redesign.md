# Chat-First UX Redesign

**Date:** 2026-01-08
**Status:** Approved

## Overview

Rediseño de la experiencia de usuario para simplificar el onboarding y adoptar un layout chat-first similar a Claude Code Web. El objetivo es que usuarios no-tecnicos puedan construir features de produccion con minima friccion.

## Decisiones de Diseño

### 1. Onboarding Simplificado (3 pasos)

**Paso 1 - Crear cuenta**
- Formulario email/password o Google OAuth
- Ruta: `/register`

**Paso 2 - Conectar Git Provider**
- Pantalla con cards: GitHub, GitLab, Bitbucket
- Ruta: `/onboarding/connect`
- Minimo 1 provider requerido

**Paso 3 - Seleccionar Repo Default**
- Combobox con search de repos
- Seleccionar repo y branch
- Ruta: `/onboarding/select-repo`
- Al completar → directo al workspace

### 2. Layout Chat-First

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] LumLabs          [repo-selector ▼] [branch ▼]    [Avatar ▼] │
├────────────────┬────────────────────────────────────────────────────┤
│                │ [Tab 1 ×] [Tab 2 ×] [+]                            │
│   SIDEBAR      ├────────────────────────────────────────────────────┤
│                │                                                    │
│   Sessions     │              MAIN AREA                             │
│   (by date)    │     (Chat o Chat + Preview split)                 │
│                │                                                    │
│   ─────────    │                                                    │
│   [Settings]   │                                                    │
└────────────────┴────────────────────────────────────────────────────┘
```

- **Sidebar**: Sesiones agrupadas por fecha
- **Header**: Selector repo/branch inline
- **Tabs**: Como navegador, multiples sesiones abiertas
- **Main**: Chat centrado → split con preview durante build

### 3. Tabs como Navegador

- Cada sesion abierta es una tab
- Boton "+" crea nueva sesion
- Tabs persistentes (localStorage + DB)
- Click en sesion del sidebar abre en nueva tab

### 4. Quick Actions (para non-tech)

```
┌──────────────────┐  ┌──────────────────┐
│ 🎨 Cambiar algo  │  │ ✨ Agregar una   │
│    en la UI      │  │    nueva feature │
└──────────────────┘  └──────────────────┘
┌──────────────────┐  ┌──────────────────┐
│ 🐛 Arreglar un   │  │ 📖 Explicame     │
│    problema      │  │    como funciona │
└──────────────────┘  └──────────────────┘
```

### 5. Plan Mode Obligatorio

Flujo siempre:
1. Usuario envia mensaje
2. Agente analiza y hace preguntas si es necesario
3. Agente presenta plan en lenguaje simple (sin codigo)
4. Usuario aprueba o ajusta
5. Solo despues → agente construye

### 6. Arquitectura Tecnica (Daytona + Claude Agent SDK)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS BACKEND                              │
│                                                                     │
│   API Route: /api/sessions/[id]/stream                              │
│   - Usa @daytonaio/sdk para crear/manejar sandboxes                │
│   - Streaming via SSE al frontend                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DAYTONA SANDBOX                                │
│                                                                     │
│   coding_agent.ts (Claude Agent SDK - TypeScript)                   │
│   - Tools: Read, Edit, Glob, Grep, Bash                             │
│   - permissionMode: "acceptEdits"                                   │
│   - systemPrompt: Plan mode enforced                                │
│                                                                     │
│   /workspace/repo (clonado)                                         │
│   Dev Server → Preview URL                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 7. Sesiones y Checkpoints

**Ciclo de vida:**
1. Usuario escribe → sesion auto-creada (nombre inferido)
2. Plan mode → preguntas y aprobacion
3. Build → sandbox creado, preview disponible
4. Ready → sandbox pausado

**Checkpoints:**
- Automaticos despues de cada cambio exitoso
- Restaurables via Daytona snapshots
- Timeline visible en el chat

## Cambios al Data Model

### Nueva tabla: `onboarding_state`
```sql
- id (PK)
- user_id (FK → users)
- completed_at (timestamp, nullable)
- default_repo_id (text)
- created_at (timestamp)
```

### Nueva tabla: `session_tabs`
```sql
- id (PK)
- user_id (FK → users)
- session_id (FK → feature_sessions)
- position (integer)
- is_active (boolean)
- opened_at (timestamp)
```

### Modificar: `feature_sessions`
```sql
+ sandbox_id (text)
+ sandbox_status (text: running|paused|deleted)
+ preview_url (text)
+ last_active_at (timestamp)
```

### Modificar: `checkpoints`
```sql
+ daytona_snapshot_id (text)
```

## Fases de Implementacion

### Fase 1: Onboarding
- [ ] Crear rutas `/onboarding/connect` y `/onboarding/select-repo`
- [ ] Modificar registro para redirigir a onboarding
- [ ] Crear tabla `onboarding_state`
- [ ] Skip onboarding si ya completado

### Fase 2: Layout Chat-First
- [ ] Rediseñar workspace con chat centrado
- [ ] Implementar tabs (UI + persistencia)
- [ ] Sidebar con sesiones por fecha
- [ ] Header con repo/branch selector

### Fase 3: Chat y Plan Mode
- [ ] Quick actions cards
- [ ] Crear sesion al enviar mensaje
- [ ] UI de plan mode (preguntas, plan card, aprobar/ajustar)
- [ ] Streaming de mensajes

### Fase 4: Integracion Daytona + Claude Agent SDK
- [ ] Setup Daytona SDK en backend
- [ ] Crear `coding_agent.ts` con system prompt
- [ ] API route para streaming
- [ ] Clone repo en sandbox
- [ ] Preview URL en iframe

### Fase 5: Checkpoints
- [ ] Checkpoints automaticos
- [ ] UI timeline en chat
- [ ] Restaurar checkpoint
- [ ] Pausar/resumir sandboxes
