# Login Page & Onboarding Design

## Overview

Implementar página de login con OAuth-first approach y onboarding minimal. Auto-crear organización para nuevos usuarios.

## Decisiones de Diseño

- **Approach**: OAuth-first (GitHub, Google, Vercel prominentes)
- **Layout**: Split screen (branding izquierda, form derecha)
- **Branding**: Gradiente oscuro + logo VibeCode
- **Onboarding**: Minimal - después de OAuth, auto-crear org y redirect
- **Plan Free**: 1 workspace, 1 miembro (sin invitaciones)

## Estructura de Rutas

```
/login          → Página principal OAuth
/login/email    → Login con email/password
/login/signup   → Registro con email
```

## Estructura de Archivos

```
src/
├── app/
│   └── login/
│       ├── page.tsx
│       ├── layout.tsx
│       ├── email/
│       │   └── page.tsx
│       └── signup/
│           └── page.tsx
│
├── features/
│   └── auth/
│       ├── components/
│       │   ├── auth-layout.tsx
│       │   ├── oauth-buttons.tsx
│       │   ├── email-form.tsx
│       │   └── auth-branding.tsx
│       ├── actions/
│       │   └── create-default-org.ts
│       └── index.ts
```

## Layout Visual

```
┌─────────────────────────────────┬─────────────────────────────────┐
│                                 │                                 │
│                                 │         Welcome back            │
│                                 │    Sign in to your account      │
│                                 │                                 │
│         [VibeCode Logo]         │   ┌─────────────────────────┐   │
│                                 │   │  ◉ Continue with GitHub │   │
│      Build features with AI     │   └─────────────────────────┘   │
│                                 │   ┌─────────────────────────┐   │
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │  ◉ Continue with Google │   │
│   ░░ Gradient Background ░░░   │   └─────────────────────────┘   │
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░   │   ┌─────────────────────────┐   │
│                                 │   │  ▲ Continue with Vercel │   │
│                                 │   └─────────────────────────┘   │
│                                 │                                 │
│                                 │   ──────── or ────────          │
│                                 │   Continue with email →         │
│                                 │                                 │
└─────────────────────────────────┴─────────────────────────────────┘
```

## Flujo Post-Login

1. Usuario hace click en OAuth provider
2. Better-Auth maneja redirect y callback
3. En callback exitoso, verificar si usuario tiene org
4. Si no tiene org → `createDefaultOrganization()`
   - Nombre: "{userName}'s Workspace"
   - Slug: derivado del nombre (ej: "lucas-workspace")
   - Plan: "free" en metadata
5. Redirect a `/w/[slug]`

## Restricciones Plan Free

```typescript
// En organizations.metadata:
{
  plan: 'free',
  maxWorkspaces: 1,
  maxMembers: 1
}
```

- No puede crear más workspaces
- No puede invitar miembros
- UI muestra upgrade prompts en esas secciones

## Estilo Visual

### Gradiente (izquierda)
- Background: `from-slate-950 via-slate-900 to-slate-950`
- Accent: overlay con primary color al 10%

### Botones OAuth
- Variante: outline con border visible
- Iconos: SVG de cada provider
- Size: lg para prominencia
- Full width

### Tipografía
- Título: `text-3xl font-semibold tracking-tight`
- Subtítulo: `text-muted-foreground text-base`

### Responsive
- Desktop: grid 2 cols 50/50
- Tablet: 40/60
- Mobile: single column, gradiente como bg sutil

## Implementación

### Fase 1: Componentes UI
- [ ] Auth layout (split screen)
- [ ] Auth branding (logo + gradient)
- [ ] OAuth buttons component
- [ ] Email form component

### Fase 2: Páginas
- [ ] /login page
- [ ] /login/email page
- [ ] /login/signup page

### Fase 3: Lógica
- [ ] Server action createDefaultOrganization
- [ ] Callback handler para auto-crear org
- [ ] Middleware para proteger rutas /w/*

### Fase 4: Polish
- [ ] Animaciones sutiles
- [ ] Loading states
- [ ] Error handling
- [ ] Mobile responsive
