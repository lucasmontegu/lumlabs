# VibeCode - B2B AI-Powered Development Platform

## Vision

VibeCode is a B2B collaborative platform that enables **non-technical business users** (product managers, business analysts, founders) to build features and applications using AI agents. Users describe what they want in plain language, and AI agents plan, design, and implement the code with live previews.

Think Lovable/Bolt but for enterprise teams with governance, collaboration, and approval workflows.

## Core Principles

1. **Users never see code** - Only functional previews and results
2. **Plan first, build second** - Every feature starts with a human-readable spec
3. **Checkpoints are free** - Automatic versioning with instant restore
4. **Collaborative** - Multiple team members can work on sessions with mentions and reviews

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 15 (App Router) | Server components, streaming |
| Auth | Better-Auth | TypeScript-first, org/team plugins |
| Database | Neon (Postgres) | Scale-to-zero, instant branching |
| File Storage | AgentFS (Turso) | Persistent filesystem with versioning |
| Execution | E2B Sandboxes | On-demand preview environments |
| Realtime | Ably | Presence, pub/sub, cheaper than Liveblocks |
| AI Agents | Claude Agent SDK + OpenCode SDK | Multi-agent orchestration |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI development |
| State | Zustand | Simple, performant client state |

---

## Architecture

### URL Structure

```
/                                    → Redirect to default workspace
/w/[workspaceSlug]                   → Dashboard (repos + recent sessions)
/w/[workspaceSlug]/s/[sessionId]     → Active session (preview + chat + history)
/w/[workspaceSlug]/connect           → Connect new repository
/w/[workspaceSlug]/settings          → Workspace settings
```

### Folder Structure (Feature-based)

```
src/
├── app/                              # Routing only, minimal logic
│   ├── layout.tsx
│   ├── page.tsx
│   └── w/[workspaceSlug]/
│       ├── layout.tsx                # Sidebar with repos
│       ├── page.tsx                  # Dashboard
│       └── s/[sessionId]/
│           ├── layout.tsx            # Header + Tabs
│           └── page.tsx              # Workspace
│
├── features/                         # Domain logic
│   ├── workspace/
│   │   ├── components/
│   │   │   ├── workspace-sidebar.tsx
│   │   │   └── workspace-dashboard.tsx
│   │   ├── stores/
│   │   │   └── workspace-store.ts
│   │   ├── hooks/
│   │   └── index.ts                  # Public API
│   │
│   ├── session/
│   │   ├── components/
│   │   │   ├── session-header.tsx
│   │   │   ├── session-tabs.tsx
│   │   │   ├── session-workspace.tsx
│   │   │   ├── session-preview.tsx
│   │   │   └── session-chat.tsx
│   │   ├── stores/
│   │   │   └── session-store.ts
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── checkpoint/
│   │   ├── components/
│   │   │   └── checkpoint-timeline.tsx
│   │   └── index.ts
│   │
│   ├── agent/
│   │   ├── orchestrator.ts           # Multi-agent pipeline
│   │   ├── agents/
│   │   │   ├── planner.ts
│   │   │   ├── builder.ts
│   │   │   └── reviewer.ts
│   │   └── index.ts
│   │
│   └── skills/
│       ├── components/
│       │   └── skills-marketplace.tsx
│       ├── loader.ts
│       └── index.ts
│
├── components/                       # Shared UI primitives
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       └── index.ts
│
├── lib/                              # Pure utilities
│   ├── utils.ts
│   ├── db.ts                         # Drizzle client
│   └── agentfs.ts                    # AgentFS client
│
└── types/
    └── index.ts
```

---

## Data Model

### Core Entities

```typescript
// Workspace (Organization/Team)
interface Workspace {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  tokenBudgetMonthly: number
  tokensUsedThisMonth: number
  createdAt: Date
}

// Repository (connected to workspace)
interface Repository {
  id: string
  workspaceId: string
  name: string                        // "tapipay-front"
  url: string                         // "https://github.com/tapi/tapipay-front"
  provider: 'github' | 'gitlab' | 'bitbucket'
  defaultBranch: string
  context: RepoContext                // Auto-generated
  connectedAt: Date
}

// Auto-generated repo context for agents
interface RepoContext {
  summary: string                     // 2-3 sentence description
  techStack: string[]                 // ["Next.js", "TypeScript", "Tailwind"]
  keyFiles: { path: string; description: string }[]
  conventions: string[]               // Coding conventions detected
  lastCommitSha: string
}

// Session (working on a repo)
interface Session {
  id: string
  workspaceId: string
  repositoryId: string
  repositoryName: string              // Denormalized for UI
  name: string                        // "Add dark mode"
  status: 'idle' | 'planning' | 'building' | 'reviewing' | 'ready' | 'error'
  previewUrl?: string                 // E2B sandbox URL
  agentfsSessionId?: string           // AgentFS session for files
  createdById: string
  createdAt: Date
  updatedAt: Date
}

// Message in session chat
interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  phase?: 'planning' | 'building' | 'review'
  mentions?: Mention[]
  metadata?: {
    tokensUsed?: number
    filesChanged?: string[]
    toolsUsed?: string[]
  }
  createdAt: Date
}

// @mentions in messages
interface Mention {
  type: 'user' | 'agent' | 'integration'
  userId?: string                     // @lucas
  agentType?: 'reviewer' | 'security' | 'ux'  // @code-reviewer
  integrationId?: string              // @slack-channel
}

// Checkpoint (version snapshot)
interface Checkpoint {
  id: string
  sessionId: string
  label: string                       // "Plan approved", "Added header"
  type: 'auto' | 'manual'
  agentfsVersionId: string            // AgentFS version reference
  screenshotUrl?: string
  createdAt: Date
}

// Skill (from marketplace or custom)
interface Skill {
  id: string
  slug: string
  name: string
  description: string
  content: string                     // Markdown with instructions
  authorType: 'platform' | 'community' | 'organization'
  organizationId?: string             // If org-specific
  version: string
  isPublic: boolean
  createdAt: Date
}
```

### Database Schema (Drizzle)

```typescript
// db/schema.ts
import { pgTable, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core'

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan').notNull().default('free'),
  tokenBudgetMonthly: integer('token_budget_monthly').default(100000),
  tokensUsedThisMonth: integer('tokens_used_this_month').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const repositories = pgTable('repositories', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  name: text('name').notNull(),
  url: text('url').notNull(),
  provider: text('provider').notNull(),
  defaultBranch: text('default_branch').default('main'),
  context: jsonb('context'),
  connectedAt: timestamp('connected_at').defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  repositoryId: text('repository_id').references(() => repositories.id),
  repositoryName: text('repository_name'),
  name: text('name').notNull(),
  status: text('status').default('idle'),
  previewUrl: text('preview_url'),
  agentfsSessionId: text('agentfs_session_id'),
  createdById: text('created_by_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  phase: text('phase'),
  mentions: jsonb('mentions'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const checkpoints = pgTable('checkpoints', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id),
  label: text('label').notNull(),
  type: text('type').default('auto'),
  agentfsVersionId: text('agentfs_version_id'),
  screenshotUrl: text('screenshot_url'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const skills = pgTable('skills', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  content: text('content').notNull(),
  authorType: text('author_type').default('platform'),
  organizationId: text('organization_id'),
  version: text('version').default('1.0.0'),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})
```

---

## Agent Pipeline

### 3-Phase Flow

```
User Request
     │
     ▼
┌─────────────┐
│   PLANNER   │  Claude Sonnet (read-only)
│             │  - Understands request
│             │  - Analyzes repo context
│             │  - Creates human-readable spec
│             │  - NO code, just plan
└─────────────┘
     │
     ▼
  [User approves plan]
     │
     ▼
┌─────────────┐
│   BUILDER   │  Claude Opus 4
│             │  - Implements code
│             │  - Writes to AgentFS
│             │  - Runs dev server in E2B
│             │  - Creates checkpoints
└─────────────┘
     │
     ▼
┌─────────────┐
│  REVIEWER   │  Claude Sonnet
│             │  - Code review
│             │  - Security check
│             │  - Returns summary (no code shown)
└─────────────┘
     │
     ▼
  [Ready for deploy]
```

### Orchestrator Implementation

```typescript
// features/agent/orchestrator.ts
import { Anthropic } from '@anthropic-ai/sdk'

interface OrchestrationContext {
  sessionId: string
  repositoryContext: RepoContext
  userRequest: string
  skills: Skill[]
}

export class FeatureOrchestrator {
  private anthropic: Anthropic

  async *processRequest(ctx: OrchestrationContext) {
    // Phase 1: Planning
    yield { phase: 'planning', status: 'started' }
    
    const plan = await this.runPlanner(ctx)
    yield { phase: 'planning', status: 'completed', plan }
    
    // Wait for user approval
    const approved = yield { phase: 'planning', status: 'awaiting_approval' }
    if (!approved) return
    
    // Phase 2: Building
    yield { phase: 'building', status: 'started' }
    
    for await (const update of this.runBuilder(ctx, plan)) {
      yield { phase: 'building', ...update }
    }
    
    // Phase 3: Review
    yield { phase: 'review', status: 'started' }
    
    const review = await this.runReviewer(ctx)
    yield { phase: 'review', status: 'completed', review }
    
    yield { phase: 'ready' }
  }

  private async runPlanner(ctx: OrchestrationContext) {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.getPlannerSystemPrompt(ctx),
      messages: [{ role: 'user', content: ctx.userRequest }]
    })
    return this.parsePlan(response)
  }

  private async *runBuilder(ctx: OrchestrationContext, plan: Plan) {
    // Use Claude Agent SDK or OpenCode SDK
    // Write files to AgentFS
    // Start E2B sandbox for preview
    // Yield progress updates
  }

  private async runReviewer(ctx: OrchestrationContext) {
    // Review code quality
    // Check security
    // Return human-readable summary
  }

  private getPlannerSystemPrompt(ctx: OrchestrationContext): string {
    return `You are a product planning assistant. Your job is to understand feature requests and create clear, actionable plans.

## Project Context
${JSON.stringify(ctx.repositoryContext, null, 2)}

## Available Skills
${ctx.skills.map(s => `- ${s.name}: ${s.description}`).join('\n')}

## Instructions
1. Understand what the user wants to achieve (not how to code it)
2. Ask clarifying questions if the request is ambiguous
3. Create a plan in plain language that a non-technical person can understand
4. DO NOT include any code or technical implementation details
5. Focus on WHAT will be built, not HOW

## Output Format
Respond with a plan that includes:
- Summary: One sentence describing the feature
- What will change: Bullet points of user-visible changes
- Questions (if any): Clarifications needed before proceeding`
  }
}
```

---

## Hybrid Storage (AgentFS + E2B)

### Why This Architecture

```
Problem: E2B sandboxes are ephemeral and costly (~$0.10/hour even idle)
Solution: Use AgentFS for persistent files, E2B only for preview/execution

Cost comparison (100 sessions/day, 30min active each):
- E2B only: ~$50/day
- AgentFS + E2B on-demand: ~$5/day
```

### Implementation

```typescript
// lib/agentfs.ts
import { createClient } from '@turso/client'

export class AgentFSClient {
  private client: ReturnType<typeof createClient>

  async writeFile(sessionId: string, path: string, content: string) {
    // Write to AgentFS (persistent, versioned)
    await this.client.execute({
      sql: `INSERT INTO files (session_id, path, content, version) VALUES (?, ?, ?, ?)`,
      args: [sessionId, path, content, Date.now()]
    })
  }

  async createCheckpoint(sessionId: string, label: string) {
    // Create version snapshot (instant, copy-on-write)
    const version = await this.client.execute({
      sql: `INSERT INTO versions (session_id, label) VALUES (?, ?) RETURNING id`,
      args: [sessionId, label]
    })
    return version.rows[0].id
  }

  async restoreCheckpoint(sessionId: string, versionId: string) {
    // Instant restore to previous version
    await this.client.execute({
      sql: `UPDATE sessions SET current_version = ? WHERE id = ?`,
      args: [versionId, sessionId]
    })
  }

  async syncToSandbox(sessionId: string, sandbox: E2BSandbox) {
    // Sync files from AgentFS to E2B sandbox
    const files = await this.getFiles(sessionId)
    for (const file of files) {
      await sandbox.filesystem.write(file.path, file.content)
    }
  }
}

// lib/sandbox.ts
import { Sandbox } from '@e2b/code-interpreter'

export class SandboxManager {
  private activeSandboxes = new Map<string, Sandbox>()
  private agentfs: AgentFSClient

  async startPreview(sessionId: string): Promise<string> {
    // Create sandbox on-demand
    const sandbox = await Sandbox.create({ timeout: 30 * 60 * 1000 })
    
    // Sync files from AgentFS
    await this.agentfs.syncToSandbox(sessionId, sandbox)
    
    // Start dev server
    await sandbox.process.start({ cmd: 'npm install && npm run dev' })
    
    this.activeSandboxes.set(sessionId, sandbox)
    return sandbox.getHost(3000)
  }

  async stopPreview(sessionId: string) {
    const sandbox = this.activeSandboxes.get(sessionId)
    if (sandbox) {
      await sandbox.kill()
      this.activeSandboxes.delete(sessionId)
    }
    // Files remain in AgentFS
  }
}
```

---

## Realtime (Ably)

### Channel Structure

```
workspace:{workspaceId}:presence     → Who's online in workspace
session:{sessionId}:chat             → Chat messages
session:{sessionId}:agent            → Agent streaming events
session:{sessionId}:preview          → Preview URL updates
```

### Implementation

```typescript
// hooks/use-session-realtime.ts
import Ably from 'ably'
import { useEffect, useState } from 'react'

export function useSessionRealtime(sessionId: string) {
  const [agentStream, setAgentStream] = useState('')
  
  useEffect(() => {
    const ably = new Ably.Realtime({ authUrl: '/api/ably-token' })
    const channel = ably.channels.get(`session:${sessionId}:agent`)
    
    channel.subscribe('stream', (message) => {
      if (message.data.type === 'chunk') {
        setAgentStream(prev => prev + message.data.content)
      } else if (message.data.type === 'done') {
        setAgentStream('')
      }
    })
    
    return () => {
      channel.unsubscribe()
      ably.close()
    }
  }, [sessionId])
  
  return { agentStream }
}
```

---

## Skills System

### Skill Structure

```markdown
---
name: shadcn/ui Components
slug: shadcn-ui
version: 1.0.0
targetAgent: builder
triggers: [button, dialog, form, input, component]
---

# shadcn/ui Integration

When user requests UI components, use shadcn/ui.

## Installation
Always use: `npx shadcn@latest add <component>`

## Component Location
Components go in `@/components/ui/`

## Best Practices
- Use the `cn()` utility for conditional classes
- Follow existing patterns in the codebase
- Import from `@/components/ui`
```

### Skill Loading

```typescript
// features/skills/loader.ts
export async function loadSkillsForSession(
  session: Session,
  userMessage: string
): Promise<Skill[]> {
  const repo = await getRepository(session.repositoryId)
  
  // 1. Core skills (always loaded)
  const coreSkills = await db.query.skills.findMany({
    where: eq(skills.authorType, 'platform')
  })
  
  // 2. Organization skills
  const orgSkills = await db.query.skills.findMany({
    where: eq(skills.organizationId, session.workspaceId)
  })
  
  // 3. Filter by triggers matching user message
  const allSkills = [...coreSkills, ...orgSkills]
  return allSkills.filter(skill => {
    const triggers = skill.triggers || []
    return triggers.some(t => userMessage.toLowerCase().includes(t))
  })
}
```

---

## UI Components

### Dashboard Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ [Logo]  Tapi                                            [Avatar]  │
├──────────────┬─────────────────────────────────────────────────────┤
│              │                                                     │
│  Dashboard   │  Welcome back                        [+ New Session]│
│  Skills      │                                                     │
│              │  REPOSITORIES                                       │
│  ─────────   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐    │
│  tapipay-    │  │tapipay- │ │webapp-  │ │tapipay- │ │+ Connect│   │
│    front     │  │  front  │ │ wallet  │ │ lambdas │ │  repo   │   │
│  webapp-     │  │3 sessions│ │1 session│ │0 session│ │         │   │
│    wallet    │  └─────────┘ └─────────┘ └─────────┘ └────────┘    │
│  tapipay-    │                                                     │
│    lambdas   │  RECENT SESSIONS                                    │
│              │  ┌──────────────────────────────────────────────┐  │
│  ─────────   │  │ 🟢 Add dark mode      tapipay-front  2m ago  │  │
│  Team        │  │ 🟡 Fix checkout       tapipay-front  1h ago  │  │
│  Settings    │  │ ⚪ Refactor auth      webapp-wallet  1d ago  │  │
│              │  └──────────────────────────────────────────────┘  │
└──────────────┴─────────────────────────────────────────────────────┘
```

### Session Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Tapi   tapipay-front / Add dark mode   [main]      [Share] [⋯]  │
├────────────────────────────────────────────────────────────────────┤
│ [Add dark mode ✕] [Fix header ✕] [+]                              │
├──────────────────────────────────┬─────────────────────────────────┤
│                                  │  Chat                 [History] │
│         PREVIEW                  │                                 │
│                                  │  ┌─────────────────────────┐   │
│    ┌──────────────────────┐     │  │ 🤖 Ready to build       │   │
│    │                      │     │  │    Describe what you    │   │
│    │    [Live Preview]    │     │  │    want to create...    │   │
│    │                      │     │  └─────────────────────────┘   │
│    │                      │     │                                 │
│    └──────────────────────┘     │  [Add a dashboard] [Create form]│
│                                  │                                 │
│    [↻] [↗] [⛶]                 │  ┌─────────────────────────────┐│
│                                  │  │ Describe what you want... ││
│                                  │  └─────────────────────────[↵]┘│
└──────────────────────────────────┴─────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Platform (Week 1-2)
- [ ] Next.js 15 setup with feature-based structure
- [ ] Better-Auth with workspace/team support
- [ ] Neon database with Drizzle schema
- [ ] Basic UI: Dashboard, Session workspace
- [ ] Mock agent responses for flow testing

### Phase 2: Agent Integration (Week 3-4)
- [ ] AgentFS setup (Turso)
- [ ] Claude Agent SDK integration
- [ ] Planner agent implementation
- [ ] Builder agent with file operations
- [ ] Checkpoint system

### Phase 3: Live Preview (Week 5)
- [ ] E2B sandbox integration
- [ ] Hybrid storage (AgentFS + E2B sync)
- [ ] Preview URL generation
- [ ] Hot reload on file changes

### Phase 4: Collaboration (Week 6)
- [ ] Ably realtime setup
- [ ] Agent streaming to UI
- [ ] @mentions system
- [ ] Presence indicators

### Phase 5: Skills & Polish (Week 7-8)
- [ ] Skills marketplace UI
- [ ] Skill loading and injection
- [ ] GitHub webhook for context updates
- [ ] Usage tracking and billing

---

## Environment Variables

```bash
# .env.local

# Database
DATABASE_URL="postgresql://..."
TURSO_DATABASE_URL="libsql://..."
TURSO_AUTH_TOKEN="..."

# Auth
BETTER_AUTH_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."

# AI
ANTHROPIC_API_KEY="..."

# Realtime
ABLY_API_KEY="..."

# Sandbox
E2B_API_KEY="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Commands

```bash
# Development
npm run dev              # Start dev server
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio

# Production
npm run build            # Build for production
npm run start            # Start production server
```

---

## Key Decisions

1. **Feature-based architecture** - Each domain (workspace, session, checkpoint, agent, skills) is self-contained with its own components, stores, and hooks

2. **AgentFS over direct E2B storage** - Persistent files with versioning, sandbox only for execution

3. **Neon over Supabase** - Scale-to-zero, AI-optimized, don't need BaaS features

4. **Ably over Liveblocks** - 10x cheaper for similar features

5. **Sessions are tabs, not routes** - Multiple sessions of the same repo can be open as tabs within the session page

6. **No code shown to users** - Everything is business-language, preview-first

7. **Plan → Build → Review pipeline** - Explicit phases with user approval gates
