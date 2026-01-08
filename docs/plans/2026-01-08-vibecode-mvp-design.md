# VibeCode MVP - Design Document

**Date:** 2026-01-08
**Status:** Approved
**Goal:** Validate that the collaboration model works for non-technical users building features with AI agents.

---

## Vision

VibeCode is a B2B collaborative platform that enables non-technical business users (product managers, business analysts, founders) to build features using AI agents. Users describe what they want in plain language, and AI agents plan, design, and implement the code with live previews.

**Core differentiator:** Multi-project, multi-session tabs with team collaboration (presence, @mentions, approval workflows).

---

## What We're Validating

1. **Multi-user collaboration** - Presence, @mentions, approval gates
2. **Full AI pipeline** - Real agents (OpenCode) building real code
3. **Live previews** - Real Daytona sandboxes with working previews
4. **Multi-session UX** - Tabs for different sessions/projects in one workspace

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 15 (App Router) | Server components, streaming |
| Auth | Better-Auth | TypeScript-first, org/team plugins (already set up) |
| Database | Neon (Postgres) + Drizzle | Scale-to-zero, type-safe |
| AI Agent | OpenCode SDK | Multi-provider, REST API, plugins, skills |
| Sandbox | Daytona | Pausable workspaces, checkpoints, preview URLs |
| Realtime | Ably | Presence, pub/sub |
| Styling | Tailwind CSS + shadcn/ui | Already set up |
| State | Zustand | Already set up |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  Next.js 15 + Zustand + Ably (presence) + shadcn/ui             │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  │ REST API + SSE
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTES                          │
│  /api/sessions, /api/messages, /api/workspaces, /api/ably-token │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
┌───────────────────────────┐     ┌───────────────────────────────┐
│      NEON (Postgres)      │     │        DAYTONA SANDBOX        │
│                           │     │                               │
│  - organizations (auth)   │     │  ┌─────────────────────────┐  │
│  - repositories           │     │  │      OpenCode Server    │  │
│  - sandboxes              │     │  │                         │  │
│  - feature_sessions       │     │  │  - Multi-provider AI    │  │
│  - messages               │     │  │  - Skills system        │  │
│  - checkpoints            │     │  │  - File operations      │  │
│  - approvals              │     │  │  - Terminal             │  │
│                           │     │  └─────────────────────────┘  │
└───────────────────────────┘     │                               │
                                  │  + Project filesystem         │
                                  │  + Dev server (preview)       │
                                  │  + Git operations             │
                                  └───────────────────────────────┘
```

---

## Sandbox & Session Model

### Resource Hierarchy

```
Proyecto (Repository)
└── 1 Daytona Sandbox (pausable)
    ├── Checkpoint History (snapshots)
    └── Múltiples OpenCode Sessions (1 por tab)
        ├── Session A → branch: feature/add-dark-mode
        ├── Session B → branch: feature/fix-checkout
        └── Session C → branch: feature/new-header
```

### Sandbox Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PAUSED    │────►│   RUNNING   │────►│   PAUSED    │
│  (storage)  │     │  (compute)  │     │  (storage)  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │    User opens     │   Idle timeout    │
      │    session tab    │   (15min)         │
      └───────────────────┴───────────────────┘
```

### Key Decisions

- **One sandbox per project** - Efficient resource usage
- **One branch per session** - Isolation without conflicts
- **Checkpoints via Daytona** - History and restore capability
- **Auto-pause on idle** - Cost optimization

---

## Database Schema

Better-Auth manages: `users`, `sessions` (auth), `organizations`, `members`, `teams`, `teamMembers`, `invitations`, `accounts`, `verifications`

**Our tables:**

```sql
-- Connected repositories
repositories (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  provider TEXT NOT NULL, -- github/gitlab
  default_branch TEXT DEFAULT 'main',
  context JSONB, -- auto-generated repo summary
  connected_at TIMESTAMP DEFAULT NOW()
)

-- Daytona sandbox per repository
sandboxes (
  id TEXT PRIMARY KEY,
  repository_id TEXT REFERENCES repositories(id),
  daytona_workspace_id TEXT, -- Daytona's ID
  status TEXT DEFAULT 'creating', -- creating/running/paused/error
  last_checkpoint_id TEXT,
  last_active_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Work sessions (tabs)
feature_sessions (
  id TEXT PRIMARY KEY,
  sandbox_id TEXT REFERENCES sandboxes(id),
  organization_id TEXT REFERENCES organizations(id),
  repository_id TEXT REFERENCES repositories(id),
  name TEXT NOT NULL, -- "Add dark mode"
  branch_name TEXT NOT NULL, -- "feature/add-dark-mode"
  opencode_session_id TEXT, -- OpenCode's session ID
  status TEXT DEFAULT 'idle', -- idle/planning/building/reviewing/ready/error
  created_by_id TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Chat messages
messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES feature_sessions(id),
  user_id TEXT REFERENCES users(id), -- null for assistant
  role TEXT NOT NULL, -- user/assistant/system
  content TEXT NOT NULL,
  phase TEXT, -- planning/building/review
  mentions JSONB, -- [{type, userId, agentType}]
  metadata JSONB, -- {tokensUsed, filesChanged}
  created_at TIMESTAMP DEFAULT NOW()
)

-- Version snapshots
checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES feature_sessions(id),
  sandbox_id TEXT REFERENCES sandboxes(id),
  label TEXT NOT NULL,
  type TEXT DEFAULT 'auto', -- auto/manual
  daytona_checkpoint_id TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Plan approvals
approvals (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES feature_sessions(id),
  message_id TEXT REFERENCES messages(id), -- the plan message
  status TEXT DEFAULT 'pending', -- pending/approved/rejected
  reviewer_id TEXT REFERENCES users(id),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
)
```

---

## Auth & Permissions

Using Better-Auth with `organization` plugin (already configured).

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Invite members | ✓ | ✓ | ✗ |
| Remove members | ✓ | ✓ | ✗ |
| Delete workspace | ✓ | ✗ | ✗ |
| Create sessions | ✓ | ✓ | ✓ |
| Approve plans | ✓ | ✓ | ✗ |
| View & comment | ✓ | ✓ | ✓ |

---

## Real-time with Ably

### Channels

```
workspace:{orgId}:presence       → Who's online in workspace
session:{sessionId}:stream       → OpenCode streaming (AI responses)
session:{sessionId}:status       → Status changes (planning→building→ready)
session:{sessionId}:approvals    → Approval notifications
```

### Presence

```typescript
// Publish presence
channel.presence.enter({
  sessionId: "current-tab",
  userId: user.id,
  avatar: user.image
})

// Subscribe to presence
channel.presence.subscribe((member) => {
  // Update UI with avatars
})
```

### Agent Streaming

```typescript
// Backend: proxy OpenCode events to Ably
const events = await opencode.event.subscribe()
for await (const event of events.stream) {
  ablyChannel.publish('agent-event', event)
}

// Frontend: receive and render
channel.subscribe('agent-event', (message) => {
  // Render agent message in real-time
})
```

---

## API Routes

```
src/app/api/
├── auth/[...all]/route.ts              ← Better-Auth handler
│
├── workspaces/
│   ├── route.ts                        ← GET (list), POST (create)
│   └── [orgId]/
│       ├── route.ts                    ← GET, PATCH, DELETE
│       └── members/route.ts            ← GET, POST (invite)
│
├── repositories/
│   ├── route.ts                        ← GET (list), POST (connect)
│   └── [repoId]/
│       ├── route.ts                    ← GET, DELETE
│       └── context/route.ts            ← POST (regenerate context)
│
├── sandboxes/
│   ├── route.ts                        ← POST (create)
│   └── [sandboxId]/
│       ├── route.ts                    ← GET status
│       ├── resume/route.ts             ← POST (resume paused)
│       ├── pause/route.ts              ← POST (pause)
│       └── checkpoints/route.ts        ← GET (list), POST (create)
│
├── sessions/
│   ├── route.ts                        ← GET (list), POST (create)
│   └── [sessionId]/
│       ├── route.ts                    ← GET, PATCH, DELETE
│       ├── messages/route.ts           ← GET (list), POST (send)
│       ├── stream/route.ts             ← GET (SSE from OpenCode)
│       ├── approve/route.ts            ← POST (approve plan)
│       └── reject/route.ts             ← POST (reject plan)
│
├── ably/
│   └── token/route.ts                  ← POST (generate Ably token)
│
└── opencode/
    └── [sandboxId]/
        ├── prompt/route.ts             ← POST (send to OpenCode)
        └── events/route.ts             ← GET (SSE proxy)
```

---

## UI Structure

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo] VibeCode    [workspace selector ▼]         [notifications] 👤 │
├────────────┬─────────────────────────────────────────────────────────┤
│            │ [Tab1: Add dark mode ✕] [Tab2: Fix checkout ✕] [+]     │
│  SIDEBAR   ├─────────────────────────────────────────────────────────┤
│            │                                                         │
│ Dashboard  │  ┌─────────────────────┐  ┌──────────────────────────┐ │
│ ─────────  │  │                     │  │ Chat              [History]│
│            │  │      PREVIEW        │  │                          │ │
│ Projects   │  │      (iframe)       │  │ [Agent messages...]      │ │
│ ○ tapipay  │  │                     │  │                          │ │
│ ○ webapp   │  │                     │  │ [Approval card]          │ │
│            │  │                     │  │                          │ │
│ ─────────  │  │                     │  │                          │ │
│ Team       │  └─────────────────────┘  │ ┌──────────────────────┐ │ │
│ Settings   │  [↻ refresh] [↗ open] [⛶] │ │ Type message... [@] │ │ │
│            │                           │ └──────────────────────┘ │ │
│            │  [Presence: 👤👤 online]   └──────────────────────────┘ │
└────────────┴─────────────────────────────────────────────────────────┘
```

### Feature Structure

```
src/features/
├── workspace/
│   ├── components/
│   │   ├── workspace-sidebar.tsx
│   │   ├── workspace-header.tsx
│   │   └── workspace-dashboard.tsx
│   └── stores/workspace-store.ts
│
├── session/
│   ├── components/
│   │   ├── session-tabs.tsx
│   │   ├── session-layout.tsx
│   │   ├── session-preview.tsx
│   │   └── session-status-bar.tsx
│   └── stores/session-store.ts
│
├── chat/
│   ├── components/
│   │   ├── chat-container.tsx
│   │   ├── chat-messages.tsx
│   │   ├── chat-input.tsx
│   │   ├── chat-approval-card.tsx
│   │   └── chat-agent-stream.tsx
│   └── stores/chat-store.ts
│
├── checkpoint/
│   ├── components/
│   │   ├── checkpoint-timeline.tsx
│   │   └── checkpoint-restore.tsx
│   └── stores/checkpoint-store.ts
│
└── presence/
    ├── components/
    │   ├── presence-avatars.tsx
    │   └── presence-indicator.tsx
    └── hooks/use-presence.ts
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Schema Drizzle (repositories, sandboxes, feature_sessions, messages, checkpoints, approvals)
- [ ] Migrate chat-store to new model with feature_sessions
- [ ] Basic API routes (CRUD sessions, messages)
- [ ] Connect Better-Auth organizations to flow

### Phase 2: Daytona Integration
- [ ] Daytona SDK client
- [ ] Create/pause/resume sandboxes
- [ ] Clone repos in sandbox
- [ ] Checkpoint system

### Phase 3: OpenCode Integration
- [ ] Install OpenCode in sandbox
- [ ] Connect `@opencode-ai/sdk` from Next.js
- [ ] SSE streaming of events
- [ ] Message proxy UI → OpenCode

### Phase 4: Session Tabs
- [ ] Multi-tab UI with independent sessions
- [ ] Branch per session
- [ ] Preview iframe per tab
- [ ] Tab switching without losing state

### Phase 5: Collaboration
- [ ] Ably setup + token auth
- [ ] Presence (who's online)
- [ ] @mentions in chat
- [ ] Approval workflow (plan → approve → build)

### Phase 6: Polish
- [ ] Checkpoint timeline UI
- [ ] Restore to previous checkpoint
- [ ] Notifications (toasts)
- [ ] Error and loading states

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth (already configured)
BETTER_AUTH_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# AI (for OpenCode)
ANTHROPIC_API_KEY="..."
OPENAI_API_KEY="..."  # optional, for multi-provider

# Daytona
DAYTONA_API_KEY="..."
DAYTONA_API_URL="..."

# Realtime
ABLY_API_KEY="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Key Decisions Summary

1. **OpenCode over Claude Agent SDK** - Multi-provider support, designed for web integration
2. **One sandbox per project** - Cost efficient, multiple sessions share sandbox
3. **Branch per session** - Isolation without conflicts
4. **Daytona checkpoints** - History and restore capability
5. **Auto-pause sandboxes** - Cost optimization on idle
6. **Ably for real-time** - Presence + streaming, cheaper than alternatives
7. **Better-Auth organizations** - Already configured, handles all auth complexity

---

## References

- [OpenCode SDK](https://opencode.ai/docs/sdk/)
- [OpenCode Plugins](https://opencode.ai/docs/plugins/)
- [OpenCode Skills](https://opencode.ai/docs/skills/)
- [Daytona Process Execution](https://www.daytona.io/docs/en/process-code-execution/)
- [Daytona + Claude Agent SDK Example](https://github.com/daytonaio/daytona/blob/main/guides/typescript/claude-agent-sdk/src/index.ts)
- [Daytona + OpenCode Example](https://github.com/daytonaio/daytona/blob/main/guides/typescript/opencode/src/index.ts)
- [OpenCode Web Example](https://github.com/chris-tse/opencode-web)
