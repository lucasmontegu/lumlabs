/**
 * Skills Feature
 *
 * Provides AI agent context injection through reusable skill definitions.
 */

// Types
export * from "./types";

// Service
export * from "./skills-service";

// Hooks
export { useSkills, useRepositorySkills } from "./hooks/use-skills";

// Components
export { SkillCard, SkillCardCompact } from "./components/skill-card";
export { SkillEditor, type SkillFormData } from "./components/skill-editor";
export { SkillsManager } from "./components/skills-manager";
