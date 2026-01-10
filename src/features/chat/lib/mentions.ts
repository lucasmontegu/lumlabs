/**
 * Mention Types
 *
 * Types for the @mention system in chat
 */

export interface MentionableUser {
  id: string;
  name: string;
  email?: string;
  image?: string;
  type: "user";
}

export interface MentionableAgent {
  id: string;
  name: string;
  description: string;
  type: "agent";
  agentType: "reviewer" | "security" | "ux" | "planner";
}

export type Mentionable = MentionableUser | MentionableAgent;

export interface MentionData {
  type: "user" | "agent" | "integration";
  userId?: string;
  userName?: string;
  agentType?: "reviewer" | "security" | "ux" | "planner";
  integrationId?: string;
}

/**
 * Parse @mentions from text content
 * Returns array of mentions and the cleaned text
 */
export function parseMentions(
  text: string,
  availableMentions: Mentionable[]
): { mentions: MentionData[]; cleanedText: string } {
  const mentionPattern = /@(\w+)/g;
  const mentions: MentionData[] = [];
  let cleanedText = text;
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    const mentionName = match[1].toLowerCase();

    // Find matching user or agent
    const found = availableMentions.find((m) =>
      m.name.toLowerCase().replace(/\s+/g, "").includes(mentionName) ||
      m.id.toLowerCase() === mentionName
    );

    if (found) {
      if (found.type === "user") {
        mentions.push({
          type: "user",
          userId: found.id,
          userName: found.name,
        });
      } else if (found.type === "agent") {
        mentions.push({
          type: "agent",
          agentType: found.agentType,
        });
      }
    }
  }

  return { mentions, cleanedText };
}

/**
 * Default AI agents that can be mentioned
 */
export const DEFAULT_AGENTS: MentionableAgent[] = [
  {
    id: "agent-reviewer",
    name: "Code Reviewer",
    description: "Reviews code for quality and best practices",
    type: "agent",
    agentType: "reviewer",
  },
  {
    id: "agent-security",
    name: "Security Checker",
    description: "Checks for security vulnerabilities",
    type: "agent",
    agentType: "security",
  },
  {
    id: "agent-ux",
    name: "UX Advisor",
    description: "Provides UX and accessibility feedback",
    type: "agent",
    agentType: "ux",
  },
  {
    id: "agent-planner",
    name: "Planner",
    description: "Helps plan and break down features",
    type: "agent",
    agentType: "planner",
  },
];

/**
 * Render mention as display text
 */
export function renderMentionText(mention: MentionData): string {
  if (mention.type === "user" && mention.userName) {
    return `@${mention.userName}`;
  }
  if (mention.type === "agent" && mention.agentType) {
    return `@${mention.agentType}`;
  }
  return "@unknown";
}
