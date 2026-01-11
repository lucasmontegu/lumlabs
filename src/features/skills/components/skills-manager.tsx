"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Search01Icon,
  FilterIcon,
  FlashIcon,
  Settings02Icon,
  BookOpen01Icon,
  Building02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SkillCard } from "./skill-card";
import { SkillEditor, type SkillFormData } from "./skill-editor";
import { useSkills } from "../hooks/use-skills";
import type { Skill } from "../types";
import { PLATFORM_SKILLS, TECH_SKILLS } from "../types";

type SkillFilter = "all" | "platform" | "organization" | "user";

export function SkillsManager() {
  const {
    skills: orgSkills,
    isLoading,
    createSkill,
    updateSkill,
    deleteSkill,
    toggleSkillActive,
  } = useSkills();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<SkillFilter>("all");
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingSkill, setEditingSkill] = React.useState<Skill | null>(null);
  const [skillToDelete, setSkillToDelete] = React.useState<Skill | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Combine all skills
  const allSkills = React.useMemo(() => {
    const platformSkills = PLATFORM_SKILLS;
    const techSkills = Object.values(TECH_SKILLS);
    return [...platformSkills, ...techSkills, ...orgSkills];
  }, [orgSkills]);

  // Filter skills based on search and filter
  const filteredSkills = React.useMemo(() => {
    let filtered = allSkills;

    // Apply type filter
    if (activeFilter !== "all") {
      filtered = filtered.filter((s) => s.authorType === activeFilter);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.triggers?.some((t) => t.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [allSkills, activeFilter, searchQuery]);

  // Group skills by type for display
  const groupedSkills = React.useMemo(() => {
    const groups: Record<string, Skill[]> = {
      platform: [],
      organization: [],
      user: [],
    };

    filteredSkills.forEach((skill) => {
      groups[skill.authorType]?.push(skill);
    });

    return groups;
  }, [filteredSkills]);

  const handleCreateNew = () => {
    setEditingSkill(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setIsEditorOpen(true);
  };

  const handleDuplicate = (skill: Skill) => {
    setEditingSkill({
      ...skill,
      id: "",
      name: `${skill.name} (Copy)`,
      slug: `${skill.slug}-copy`,
      authorType: "organization",
    });
    setIsEditorOpen(true);
  };

  const handleSave = async (data: SkillFormData) => {
    setIsSaving(true);
    try {
      if (editingSkill?.id) {
        await updateSkill(editingSkill.id, data);
      } else {
        await createSkill(data);
      }
      setIsEditorOpen(false);
      setEditingSkill(null);
    } catch (error) {
      console.error("Failed to save skill:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!skillToDelete) return;
    try {
      await deleteSkill(skillToDelete.id);
      setSkillToDelete(null);
    } catch (error) {
      console.error("Failed to delete skill:", error);
    }
  };

  const handleToggleActive = async (skill: Skill, isActive: boolean) => {
    try {
      await toggleSkillActive(skill.id, isActive);
    } catch (error) {
      console.error("Failed to toggle skill:", error);
    }
  };

  const filterCounts = React.useMemo(() => ({
    all: allSkills.length,
    platform: allSkills.filter((s) => s.authorType === "platform").length,
    organization: allSkills.filter((s) => s.authorType === "organization").length,
    user: allSkills.filter((s) => s.authorType === "user").length,
  }), [allSkills]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Skills</h1>
          <p className="text-sm text-muted-foreground">
            Manage agent capabilities and context injections
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
          Create Skill
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 border-b border-border px-6 py-3">
        <div className="relative flex-1 max-w-md">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as SkillFilter)}
        >
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              <HugeiconsIcon icon={FlashIcon} className="size-3.5" />
              All
              <span className="text-muted-foreground">({filterCounts.all})</span>
            </TabsTrigger>
            <TabsTrigger value="platform" className="gap-1.5">
              <HugeiconsIcon icon={BookOpen01Icon} className="size-3.5" />
              Platform
            </TabsTrigger>
            <TabsTrigger value="organization" className="gap-1.5">
              <HugeiconsIcon icon={Building02Icon} className="size-3.5" />
              Organization
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full size-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredSkills.length === 0 ? (
          <EmptyState
            searchQuery={searchQuery}
            activeFilter={activeFilter}
            onCreateNew={handleCreateNew}
          />
        ) : (
          <div className="space-y-8">
            {/* Organization Skills (Editable) */}
            {groupedSkills.organization.length > 0 && (
              <SkillSection
                title="Organization Skills"
                description="Custom skills for your workspace"
                icon={Building02Icon}
                skills={groupedSkills.organization}
                onEdit={handleEdit}
                onDelete={setSkillToDelete}
                onDuplicate={handleDuplicate}
                onToggleActive={handleToggleActive}
              />
            )}

            {/* Platform Skills (Read-only) */}
            {groupedSkills.platform.length > 0 && (
              <SkillSection
                title="Platform Skills"
                description="Built-in skills available to all workspaces"
                icon={BookOpen01Icon}
                skills={groupedSkills.platform}
                onDuplicate={handleDuplicate}
                isReadOnly
              />
            )}
          </div>
        )}
      </div>

      {/* Skill Editor Sheet */}
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0">
          <SkillEditor
            skill={editingSkill}
            onSave={handleSave}
            onCancel={() => setIsEditorOpen(false)}
            isLoading={isSaving}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!skillToDelete}
        onOpenChange={(open) => !open && setSkillToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{skillToDelete?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Section component for grouping skills
 */
function SkillSection({
  title,
  description,
  icon,
  skills,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  isReadOnly = false,
}: {
  title: string;
  description: string;
  icon: typeof FlashIcon;
  skills: Skill[];
  onEdit?: (skill: Skill) => void;
  onDelete?: (skill: Skill) => void;
  onDuplicate?: (skill: Skill) => void;
  onToggleActive?: (skill: Skill, isActive: boolean) => void;
  isReadOnly?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <HugeiconsIcon icon={icon} className="size-5 text-muted-foreground" />
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onToggleActive={onToggleActive}
            isReadOnly={isReadOnly}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({
  searchQuery,
  activeFilter,
  onCreateNew,
}: {
  searchQuery: string;
  activeFilter: SkillFilter;
  onCreateNew: () => void;
}) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <HugeiconsIcon
          icon={Search01Icon}
          className="size-12 text-muted-foreground/50 mb-4"
        />
        <h3 className="font-medium mb-1">No skills found</h3>
        <p className="text-sm text-muted-foreground">
          No skills match &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  if (activeFilter === "organization") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <HugeiconsIcon
          icon={FlashIcon}
          className="size-12 text-muted-foreground/50 mb-4"
        />
        <h3 className="font-medium mb-1">No organization skills yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create custom skills to enhance your AI agent with workspace-specific
          knowledge
        </p>
        <Button onClick={onCreateNew} className="gap-2">
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
          Create Your First Skill
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <HugeiconsIcon
        icon={FlashIcon}
        className="size-12 text-muted-foreground/50 mb-4"
      />
      <h3 className="font-medium mb-1">No skills available</h3>
      <p className="text-sm text-muted-foreground">
        Skills help customize how the AI agent works
      </p>
    </div>
  );
}
