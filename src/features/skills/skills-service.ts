/**
 * Skills Service
 *
 * Loads and manages skills for AI agent context injection.
 * Skills help the agent understand project-specific patterns and conventions.
 */

import { db } from "@/db";
import { skills, repositorySkills, repositories } from "@/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import {
  type Skill,
  type SkillContext,
  PLATFORM_SKILLS,
  TECH_SKILLS,
} from "./types";

/**
 * Load all skills applicable to a session
 *
 * Priority order:
 * 1. Platform skills (always loaded)
 * 2. Tech-specific skills (based on repo tech stack)
 * 3. Organization skills (custom skills for the workspace)
 * 4. Repository-specific skills (assigned to the repo)
 */
export async function loadSkillsForSession(
  repositoryId: string,
  userMessage?: string
): Promise<SkillContext[]> {
  // 1. Get repository info with tech stack
  const repo = await db
    .select()
    .from(repositories)
    .where(eq(repositories.id, repositoryId))
    .limit(1);

  if (!repo[0]) {
    // Return platform skills only if repo not found
    return filterSkillsByMessage(
      PLATFORM_SKILLS.map(skillToContext),
      userMessage
    );
  }

  const repoContext = repo[0].context as {
    techStack?: string[];
    conventions?: string[];
  } | null;

  // 2. Load organization skills
  const orgSkills = await db
    .select()
    .from(skills)
    .where(
      and(
        eq(skills.organizationId, repo[0].organizationId),
        eq(skills.isActive, true)
      )
    );

  // 3. Load repository-specific skills
  const repoSkillLinks = await db
    .select({
      skill: skills,
      priority: repositorySkills.priority,
    })
    .from(repositorySkills)
    .innerJoin(skills, eq(repositorySkills.skillId, skills.id))
    .where(
      and(
        eq(repositorySkills.repositoryId, repositoryId),
        eq(skills.isActive, true)
      )
    );

  // 4. Collect all skills
  const allSkills: SkillContext[] = [];

  // Add platform skills
  allSkills.push(...PLATFORM_SKILLS.map(skillToContext));

  // Add tech-specific skills based on repo tech stack
  if (repoContext?.techStack) {
    for (const tech of repoContext.techStack) {
      const lowerTech = tech.toLowerCase();
      for (const [key, skill] of Object.entries(TECH_SKILLS)) {
        if (lowerTech.includes(key) || key.includes(lowerTech)) {
          allSkills.push(skillToContext(skill));
        }
      }
    }
  }

  // Add organization skills
  for (const skill of orgSkills) {
    allSkills.push({
      name: skill.name,
      slug: skill.slug,
      content: skill.content,
      triggers: skill.triggers as string[] | undefined,
    });
  }

  // Add repository-specific skills (higher priority)
  for (const { skill, priority } of repoSkillLinks) {
    allSkills.push({
      name: skill.name,
      slug: skill.slug,
      content: skill.content,
      triggers: skill.triggers as string[] | undefined,
    });
  }

  // Filter by message triggers if provided
  return filterSkillsByMessage(allSkills, userMessage);
}

/**
 * Filter skills based on message content and triggers
 */
function filterSkillsByMessage(
  skills: SkillContext[],
  message?: string
): SkillContext[] {
  if (!message) {
    return skills;
  }

  const lowerMessage = message.toLowerCase();

  return skills.filter((skill) => {
    // Always include skills without triggers
    if (!skill.triggers || skill.triggers.length === 0) {
      return true;
    }

    // Check if any trigger matches
    return skill.triggers.some((trigger) =>
      lowerMessage.includes(trigger.toLowerCase())
    );
  });
}

/**
 * Convert Skill to SkillContext for agent injection
 */
function skillToContext(skill: Skill): SkillContext {
  return {
    name: skill.name,
    slug: skill.slug,
    content: skill.content,
    triggers: skill.triggers,
  };
}

/**
 * Create a new skill for an organization
 */
export async function createSkill(
  organizationId: string,
  data: {
    name: string;
    slug: string;
    description?: string;
    content: string;
    triggers?: string[];
  }
): Promise<Skill> {
  const id = `skill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const [created] = await db
    .insert(skills)
    .values({
      id,
      organizationId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      content: data.content,
      triggers: data.triggers,
      authorType: "organization",
      isActive: true,
      version: "1.0.0",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    description: created.description || undefined,
    content: created.content,
    triggers: created.triggers as string[] | undefined,
    authorType: created.authorType as "platform" | "organization" | "user",
    isActive: created.isActive,
    version: created.version || undefined,
  };
}

/**
 * Update an existing skill
 */
export async function updateSkill(
  skillId: string,
  data: Partial<{
    name: string;
    description: string;
    content: string;
    triggers: string[];
    isActive: boolean;
  }>
): Promise<void> {
  await db
    .update(skills)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, skillId));
}

/**
 * Delete a skill
 */
export async function deleteSkill(skillId: string): Promise<void> {
  await db.delete(skills).where(eq(skills.id, skillId));
}

/**
 * List all skills for an organization
 */
export async function listOrganizationSkills(
  organizationId: string
): Promise<Skill[]> {
  const results = await db
    .select()
    .from(skills)
    .where(eq(skills.organizationId, organizationId))
    .orderBy(skills.name);

  return results.map((s: typeof skills.$inferSelect) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description || undefined,
    content: s.content,
    triggers: s.triggers as string[] | undefined,
    authorType: s.authorType as "platform" | "organization" | "user",
    isActive: s.isActive,
    version: s.version || undefined,
  }));
}

/**
 * Assign a skill to a repository
 */
export async function assignSkillToRepository(
  repositoryId: string,
  skillId: string,
  priority: "low" | "normal" | "high" = "normal"
): Promise<void> {
  const id = `reposkill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await db.insert(repositorySkills).values({
    id,
    repositoryId,
    skillId,
    priority,
    createdAt: new Date(),
  });
}

/**
 * Remove a skill from a repository
 */
export async function removeSkillFromRepository(
  repositoryId: string,
  skillId: string
): Promise<void> {
  await db
    .delete(repositorySkills)
    .where(
      and(
        eq(repositorySkills.repositoryId, repositoryId),
        eq(repositorySkills.skillId, skillId)
      )
    );
}

/**
 * Get all platform skills
 */
export function getPlatformSkills(): Skill[] {
  return PLATFORM_SKILLS;
}

/**
 * Get tech-specific skills
 */
export function getTechSkills(): Record<string, Skill> {
  return TECH_SKILLS;
}
