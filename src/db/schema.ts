import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    activeOrganizationId: text("active_organization_id"),
    activeTeamId: text("active_team_id"),
  },
  (table) => [index("sessions_userId_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("accounts_userId_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("organizations_slug_uidx").on(table.slug)],
);

export const teams = pgTable(
  "teams",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(
      () => /* @__PURE__ */ new Date(),
    ),
  },
  (table) => [index("teams_organizationId_idx").on(table.organizationId)],
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("teamMembers_teamId_idx").on(table.teamId),
    index("teamMembers_userId_idx").on(table.userId),
  ],
);

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("members_organizationId_idx").on(table.organizationId),
    index("members_userId_idx").on(table.userId),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    teamId: text("team_id"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitations_organizationId_idx").on(table.organizationId),
    index("invitations_email_idx").on(table.email),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  teamMembers: many(teamMembers),
  members: many(members),
  invitations: many(invitations),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  teams: many(teams),
  members: many(members),
  invitations: many(invitations),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organizations: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  teamMembers: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  teams: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  users: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const membersRelations = relations(members, ({ one }) => ({
  organizations: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  users: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organizations: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  users: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
}));

// Git provider connections (separate from login OAuth)
export const gitConnections = pgTable(
  "git_connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // github | gitlab | bitbucket
    providerAccountId: text("provider_account_id").notNull(),
    providerUsername: text("provider_username"), // For display
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at"),
    scopes: text("scopes"),
    connectedAt: timestamp("connected_at").defaultNow().notNull(),
  },
  (table) => [
    index("gitConnections_userId_idx").on(table.userId),
    uniqueIndex("gitConnections_userId_provider_uidx").on(
      table.userId,
      table.provider
    ),
  ]
);

export const gitConnectionsRelations = relations(gitConnections, ({ one }) => ({
  user: one(users, {
    fields: [gitConnections.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// VIBECODE MVP TABLES
// ============================================================================

// Connected repositories
export const repositories = pgTable(
  "repositories",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "tapipay-front"
    url: text("url").notNull(), // e.g. "https://github.com/tapi/tapipay-front"
    provider: text("provider").notNull(), // github/gitlab/bitbucket
    defaultBranch: text("default_branch").default("main"),
    context: jsonb("context"), // auto-generated repo summary
    connectedAt: timestamp("connected_at").defaultNow().notNull(),
  },
  (table) => [
    index("repositories_organizationId_idx").on(table.organizationId),
  ]
);

// Daytona sandbox per repository
export const sandboxes = pgTable(
  "sandboxes",
  {
    id: text("id").primaryKey(),
    repositoryId: text("repository_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    daytonaWorkspaceId: text("daytona_workspace_id"), // Daytona's ID
    status: text("status").default("creating").notNull(), // creating/running/paused/error
    lastCheckpointId: text("last_checkpoint_id"),
    lastActiveAt: timestamp("last_active_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("sandboxes_repositoryId_idx").on(table.repositoryId)]
);

// Work sessions (tabs) - renamed from sessions to avoid conflict with auth sessions
export const featureSessions = pgTable(
  "feature_sessions",
  {
    id: text("id").primaryKey(),
    sandboxId: text("sandbox_id").references(() => sandboxes.id, {
      onDelete: "set null",
    }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    repositoryId: text("repository_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "Add dark mode"
    branchName: text("branch_name").notNull(), // "feature/add-dark-mode"
    opencodeSessionId: text("opencode_session_id"), // OpenCode's session ID
    status: text("status").default("idle").notNull(), // idle/planning/building/reviewing/ready/error
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("featureSessions_organizationId_idx").on(table.organizationId),
    index("featureSessions_repositoryId_idx").on(table.repositoryId),
    index("featureSessions_sandboxId_idx").on(table.sandboxId),
    index("featureSessions_createdById_idx").on(table.createdById),
  ]
);

// Chat messages
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => featureSessions.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id), // null for assistant
    role: text("role").notNull(), // user/assistant/system
    content: text("content").notNull(),
    phase: text("phase"), // planning/building/review
    mentions: jsonb("mentions"), // [{type, userId, agentType}]
    metadata: jsonb("metadata"), // {tokensUsed, filesChanged}
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("messages_sessionId_idx").on(table.sessionId),
    index("messages_userId_idx").on(table.userId),
  ]
);

// Version snapshots
export const checkpoints = pgTable(
  "checkpoints",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => featureSessions.id, { onDelete: "cascade" }),
    sandboxId: text("sandbox_id").references(() => sandboxes.id, {
      onDelete: "set null",
    }),
    label: text("label").notNull(),
    type: text("type").default("auto").notNull(), // auto/manual
    daytonaCheckpointId: text("daytona_checkpoint_id"),
    screenshotUrl: text("screenshot_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("checkpoints_sessionId_idx").on(table.sessionId),
    index("checkpoints_sandboxId_idx").on(table.sandboxId),
  ]
);

// Plan approvals
export const approvals = pgTable(
  "approvals",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => featureSessions.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }), // the plan message
    status: text("status").default("pending").notNull(), // pending/approved/rejected
    reviewerId: text("reviewer_id").references(() => users.id),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at"),
  },
  (table) => [
    index("approvals_sessionId_idx").on(table.sessionId),
    index("approvals_messageId_idx").on(table.messageId),
    index("approvals_reviewerId_idx").on(table.reviewerId),
  ]
);

// ============================================================================
// VIBECODE RELATIONS
// ============================================================================

export const repositoriesRelations = relations(repositories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [repositories.organizationId],
    references: [organizations.id],
  }),
  sandboxes: many(sandboxes),
  featureSessions: many(featureSessions),
}));

export const sandboxesRelations = relations(sandboxes, ({ one, many }) => ({
  repository: one(repositories, {
    fields: [sandboxes.repositoryId],
    references: [repositories.id],
  }),
  featureSessions: many(featureSessions),
  checkpoints: many(checkpoints),
}));

export const featureSessionsRelations = relations(featureSessions, ({ one, many }) => ({
  sandbox: one(sandboxes, {
    fields: [featureSessions.sandboxId],
    references: [sandboxes.id],
  }),
  organization: one(organizations, {
    fields: [featureSessions.organizationId],
    references: [organizations.id],
  }),
  repository: one(repositories, {
    fields: [featureSessions.repositoryId],
    references: [repositories.id],
  }),
  createdBy: one(users, {
    fields: [featureSessions.createdById],
    references: [users.id],
  }),
  messages: many(messages),
  checkpoints: many(checkpoints),
  approvals: many(approvals),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  session: one(featureSessions, {
    fields: [messages.sessionId],
    references: [featureSessions.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  approvals: many(approvals),
}));

export const checkpointsRelations = relations(checkpoints, ({ one }) => ({
  session: one(featureSessions, {
    fields: [checkpoints.sessionId],
    references: [featureSessions.id],
  }),
  sandbox: one(sandboxes, {
    fields: [checkpoints.sandboxId],
    references: [sandboxes.id],
  }),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  session: one(featureSessions, {
    fields: [approvals.sessionId],
    references: [featureSessions.id],
  }),
  message: one(messages, {
    fields: [approvals.messageId],
    references: [messages.id],
  }),
  reviewer: one(users, {
    fields: [approvals.reviewerId],
    references: [users.id],
  }),
}));

// ============================================================================
// ONBOARDING
// ============================================================================

// Track user onboarding progress
export const onboardingState = pgTable(
  "onboarding_state",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    step: text("step").default("connect").notNull(), // connect | select-repo | completed
    defaultRepositoryId: text("default_repository_id").references(
      () => repositories.id,
      { onDelete: "set null" }
    ),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("onboardingState_userId_uidx").on(table.userId),
  ]
);

export const onboardingStateRelations = relations(onboardingState, ({ one }) => ({
  user: one(users, {
    fields: [onboardingState.userId],
    references: [users.id],
  }),
  defaultRepository: one(repositories, {
    fields: [onboardingState.defaultRepositoryId],
    references: [repositories.id],
  }),
}));
