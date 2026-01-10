"use client";

import * as React from "react";
import { useActiveOrganization } from "@/lib/auth-client";
import type { Skill } from "../types";
import type { SkillFormData } from "../components/skill-editor";

interface UseSkillsReturn {
  skills: Skill[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSkill: (data: SkillFormData) => Promise<Skill>;
  updateSkill: (skillId: string, data: Partial<SkillFormData>) => Promise<void>;
  deleteSkill: (skillId: string) => Promise<void>;
  toggleSkillActive: (skillId: string, isActive: boolean) => Promise<void>;
}

export function useSkills(): UseSkillsReturn {
  const { data: activeOrg } = useActiveOrganization();
  const [skills, setSkills] = React.useState<Skill[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const organizationId = activeOrg?.id;

  // Fetch skills
  const fetchSkills = React.useCallback(async () => {
    if (!organizationId) {
      setSkills([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/skills");
      if (!response.ok) {
        throw new Error("Failed to fetch skills");
      }

      const data = await response.json();
      setSkills(data.skills || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch skills");
      setSkills([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // Initial fetch
  React.useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Create skill
  const createSkill = React.useCallback(
    async (data: SkillFormData): Promise<Skill> => {
      const response = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create skill");
      }

      const { skill } = await response.json();

      // Update local state
      setSkills((prev) => [...prev, skill]);

      return skill;
    },
    []
  );

  // Update skill
  const updateSkill = React.useCallback(
    async (skillId: string, data: Partial<SkillFormData>): Promise<void> => {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update skill");
      }

      const { skill } = await response.json();

      // Update local state
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, ...skill } : s))
      );
    },
    []
  );

  // Delete skill
  const deleteSkill = React.useCallback(
    async (skillId: string): Promise<void> => {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete skill");
      }

      // Update local state
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
    },
    []
  );

  // Toggle skill active state
  const toggleSkillActive = React.useCallback(
    async (skillId: string, isActive: boolean): Promise<void> => {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle skill");
      }

      // Update local state
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, isActive } : s))
      );
    },
    []
  );

  return {
    skills,
    isLoading,
    error,
    refetch: fetchSkills,
    createSkill,
    updateSkill,
    deleteSkill,
    toggleSkillActive,
  };
}

/**
 * Hook to get skills for a specific repository
 */
export function useRepositorySkills(repositoryId: string | undefined) {
  const [skills, setSkills] = React.useState<Skill[]>([]);
  const [assignedSkillIds, setAssignedSkillIds] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch repository skills
  const fetchSkills = React.useCallback(async () => {
    if (!repositoryId) {
      setSkills([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/repositories/${repositoryId}/skills`);
      if (!response.ok) {
        throw new Error("Failed to fetch repository skills");
      }

      const data = await response.json();
      setSkills(data.availableSkills || []);
      setAssignedSkillIds(data.assignedSkillIds || []);
    } catch (err) {
      console.error("Failed to fetch repository skills:", err);
    } finally {
      setIsLoading(false);
    }
  }, [repositoryId]);

  React.useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Assign skill to repository
  const assignSkill = React.useCallback(
    async (skillId: string, priority: "low" | "normal" | "high" = "normal") => {
      if (!repositoryId) return;

      const response = await fetch(`/api/repositories/${repositoryId}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, priority }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign skill");
      }

      setAssignedSkillIds((prev) => [...prev, skillId]);
    },
    [repositoryId]
  );

  // Remove skill from repository
  const removeSkill = React.useCallback(
    async (skillId: string) => {
      if (!repositoryId) return;

      const response = await fetch(
        `/api/repositories/${repositoryId}/skills/${skillId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove skill");
      }

      setAssignedSkillIds((prev) => prev.filter((id) => id !== skillId));
    },
    [repositoryId]
  );

  return {
    skills,
    assignedSkillIds,
    isLoading,
    refetch: fetchSkills,
    assignSkill,
    removeSkill,
  };
}
