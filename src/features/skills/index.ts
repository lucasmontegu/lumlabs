/**
 * Skills Feature
 *
 * Provides AI agent context injection through reusable skill definitions.
 *
 * NOTE: Server-side services (skills-service.ts) must be imported directly:
 *   import { loadSkillsForSession } from "@/features/skills/skills-service"
 */

// Types (safe for client and server)
export * from "./types";

// Hooks (client-safe)
export { useSkills, useRepositorySkills } from "./hooks/use-skills";

// Components (client-safe)
export { SkillCard, SkillCardCompact } from "./components/skill-card";
export { SkillEditor, type SkillFormData } from "./components/skill-editor";
export { SkillsManager } from "./components/skills-manager";
