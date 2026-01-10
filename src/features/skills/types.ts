/**
 * Skills System Types
 *
 * Skills are context injections for the AI agent that help it understand
 * project-specific patterns, conventions, and best practices.
 */

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description?: string;
  content: string; // Markdown instructions for agent
  triggers?: string[]; // Keywords that activate this skill
  authorType: "platform" | "organization" | "user";
  isActive: boolean;
  version?: string;
}

export interface RepositorySkill {
  skillId: string;
  priority: "low" | "normal" | "high";
}

/**
 * Skill context for agent injection
 */
export interface SkillContext {
  name: string;
  slug: string;
  content: string;
  triggers?: string[];
}

/**
 * Default platform skills that are always available
 */
export const PLATFORM_SKILLS: Skill[] = [
  {
    id: "platform-ui-components",
    name: "UI Components",
    slug: "ui-components",
    description: "Guidelines for creating and modifying UI components",
    content: `When creating or modifying UI elements:
- Use existing component patterns from the project
- Ensure accessibility (proper labels, keyboard navigation, ARIA attributes)
- Keep styling consistent with the existing design system
- Test on mobile and desktop viewport sizes
- Prefer composition over inheritance for component structure`,
    triggers: ["button", "form", "modal", "dialog", "input", "select", "card", "component", "ui"],
    authorType: "platform",
    isActive: true,
    version: "1.0.0",
  },
  {
    id: "platform-api-integration",
    name: "API Integration",
    slug: "api-integration",
    description: "Guidelines for API calls and data fetching",
    content: `When working with APIs and data:
- Handle loading, error, and empty states gracefully
- Use existing patterns for data fetching in the project
- Add appropriate error messages for users in plain language
- Consider caching and optimistic updates where appropriate
- Never expose sensitive data or API keys in client-side code`,
    triggers: ["api", "fetch", "data", "endpoint", "request", "response", "query"],
    authorType: "platform",
    isActive: true,
    version: "1.0.0",
  },
  {
    id: "platform-forms",
    name: "Form Handling",
    slug: "forms",
    description: "Guidelines for form creation and validation",
    content: `When creating or modifying forms:
- Validate inputs before submission
- Show clear error messages next to the relevant field
- Disable submit button while processing
- Provide confirmation on successful submission
- Support keyboard navigation (Tab, Enter, Escape)`,
    triggers: ["form", "input", "validation", "submit", "field", "checkbox", "radio"],
    authorType: "platform",
    isActive: true,
    version: "1.0.0",
  },
  {
    id: "platform-navigation",
    name: "Navigation & Routing",
    slug: "navigation",
    description: "Guidelines for page navigation and routing",
    content: `When working with navigation:
- Use the project's existing router patterns
- Ensure back button works as expected
- Preserve scroll position when appropriate
- Handle 404 and error states gracefully
- Use semantic navigation elements (nav, links)`,
    triggers: ["navigation", "route", "link", "page", "redirect", "menu", "sidebar"],
    authorType: "platform",
    isActive: true,
    version: "1.0.0",
  },
  {
    id: "platform-styling",
    name: "Styling & Design",
    slug: "styling",
    description: "Guidelines for visual styling and design consistency",
    content: `When applying styles:
- Follow the existing design system colors and spacing
- Use the project's CSS methodology (Tailwind, CSS modules, etc.)
- Ensure dark mode support if the project uses it
- Maintain responsive design across breakpoints
- Keep visual hierarchy clear and consistent`,
    triggers: ["style", "css", "color", "theme", "dark mode", "responsive", "layout", "design"],
    authorType: "platform",
    isActive: true,
    version: "1.0.0",
  },
  {
    id: "platform-testing",
    name: "Testing",
    slug: "testing",
    description: "Guidelines for adding tests",
    content: `When adding or modifying tests:
- Follow existing test patterns in the project
- Test user-facing behavior, not implementation details
- Include edge cases and error scenarios
- Keep tests focused and independent
- Use meaningful test descriptions`,
    triggers: ["test", "testing", "spec", "jest", "vitest", "cypress", "playwright"],
    authorType: "platform",
    isActive: true,
    version: "1.0.0",
  },
];

/**
 * Technology-specific skills (auto-detected based on project)
 */
export const TECH_SKILLS: Record<string, Skill> = {
  react: {
    id: "tech-react",
    name: "React Patterns",
    slug: "react",
    description: "React-specific best practices",
    content: `React-specific guidelines:
- Use functional components with hooks
- Follow the existing state management pattern (useState, context, Zustand, etc.)
- Memoize expensive computations when needed
- Keep components focused on single responsibilities
- Use proper key props for lists`,
    triggers: ["react", "component", "hook", "useState", "useEffect", "jsx"],
    authorType: "platform",
    isActive: true,
    version: "1.0.0",
  },
  nextjs: {
    id: "tech-nextjs",
    name: "Next.js Patterns",
    slug: "nextjs",
    description: "Next.js-specific best practices",
    content: `Next.js-specific guidelines:
- Use App Router conventions (layout.tsx, page.tsx, loading.tsx)
- Prefer Server Components for data fetching
- Use 'use client' directive only when necessary
- Handle metadata for SEO appropriately
- Use Next.js Image and Link components`,
    triggers: ["next", "nextjs", "app router", "server component", "api route"],
    authorType: "platform",
    isActive: true,
    version: "1.0.0",
  },
  tailwind: {
    id: "tech-tailwind",
    name: "Tailwind CSS",
    slug: "tailwind",
    description: "Tailwind CSS patterns",
    content: `Tailwind CSS guidelines:
- Use utility classes consistently
- Follow mobile-first responsive design (sm:, md:, lg:)
- Use the cn() or clsx() utility for conditional classes
- Prefer Tailwind utilities over custom CSS
- Use CSS variables for theme customization`,
    triggers: ["tailwind", "className", "utility class", "responsive"],
    authorType: "platform",
    isActive: true,
    version: "1.0.0",
  },
  typescript: {
    id: "tech-typescript",
    name: "TypeScript",
    slug: "typescript",
    description: "TypeScript best practices",
    content: `TypeScript guidelines:
- Define proper types for all data structures
- Avoid 'any' type unless absolutely necessary
- Use type inference where it's clear
- Export types that are used across files
- Use discriminated unions for complex state`,
    triggers: ["typescript", "type", "interface", "generic"],
    authorType: "platform",
    isActive: true,
    version: "1.0.0",
  },
};
