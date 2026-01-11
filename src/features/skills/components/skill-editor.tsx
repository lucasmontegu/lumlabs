"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FlashIcon,
  Add01Icon,
  Cancel01Icon,
  InformationCircleIcon,
  ViewIcon,
  CodeIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Skill } from "../types";

interface SkillEditorProps {
  skill?: Skill | null;
  onSave: (data: SkillFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface SkillFormData {
  name: string;
  slug: string;
  description: string;
  content: string;
  triggers: string[];
}

const SKILL_TEMPLATES = [
  {
    id: "blank",
    name: "Blank",
    description: "Start from scratch",
    content: "",
    triggers: [],
  },
  {
    id: "component",
    name: "Component Pattern",
    description: "UI component guidelines",
    content: `When creating this type of component:

## Structure
- Follow the existing component patterns in the codebase
- Keep components focused on a single responsibility

## Styling
- Use the existing design system
- Ensure responsive design

## Accessibility
- Include proper ARIA attributes
- Support keyboard navigation

## Examples
\`\`\`tsx
// Example code here
\`\`\``,
    triggers: ["component", "ui"],
  },
  {
    id: "api",
    name: "API Pattern",
    description: "API integration guidelines",
    content: `When working with this API:

## Endpoints
- GET /api/resource - List resources
- POST /api/resource - Create resource

## Request Format
\`\`\`json
{
  "field": "value"
}
\`\`\`

## Response Handling
- Handle loading states
- Display user-friendly error messages
- Cache responses when appropriate`,
    triggers: ["api", "fetch", "request"],
  },
  {
    id: "workflow",
    name: "Workflow",
    description: "Process or workflow guidelines",
    content: `When implementing this workflow:

## Steps
1. First step description
2. Second step description
3. Third step description

## Validation
- Check condition A before proceeding
- Ensure user confirmation for destructive actions

## Edge Cases
- Handle empty states
- Handle error recovery`,
    triggers: ["workflow", "process"],
  },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function SkillEditor({
  skill,
  onSave,
  onCancel,
  isLoading = false,
}: SkillEditorProps) {
  const [formData, setFormData] = React.useState<SkillFormData>({
    name: skill?.name || "",
    slug: skill?.slug || "",
    description: skill?.description || "",
    content: skill?.content || "",
    triggers: skill?.triggers || [],
  });
  const [triggerInput, setTriggerInput] = React.useState("");
  const [autoSlug, setAutoSlug] = React.useState(!skill);
  const [activeTab, setActiveTab] = React.useState<"edit" | "preview">("edit");

  const isEditing = !!skill;

  // Auto-generate slug from name
  React.useEffect(() => {
    if (autoSlug && formData.name) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(formData.name),
      }));
    }
  }, [formData.name, autoSlug]);

  const handleChange = (
    field: keyof SkillFormData,
    value: string | string[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Disable auto-slug if user manually edits slug
    if (field === "slug") {
      setAutoSlug(false);
    }
  };

  const addTrigger = () => {
    const trigger = triggerInput.trim().toLowerCase();
    if (trigger && !formData.triggers.includes(trigger)) {
      handleChange("triggers", [...formData.triggers, trigger]);
      setTriggerInput("");
    }
  };

  const removeTrigger = (trigger: string) => {
    handleChange(
      "triggers",
      formData.triggers.filter((t) => t !== trigger)
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTrigger();
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = SKILL_TEMPLATES.find((t) => t.id === templateId);
    if (template && template.id !== "blank") {
      setFormData((prev) => ({
        ...prev,
        content: template.content,
        triggers: [...new Set([...prev.triggers, ...template.triggers])],
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isValid =
    formData.name.trim() !== "" &&
    formData.slug.trim() !== "" &&
    formData.content.trim() !== "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <HugeiconsIcon icon={FlashIcon} className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">
              {isEditing ? "Edit Skill" : "Create Skill"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Modify the skill configuration"
                : "Add a new skill to enhance your agent"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" type="button" onClick={onCancel}>
          <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Basic Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Authentication Flow"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="slug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <HugeiconsIcon
                        icon={InformationCircleIcon}
                        className="size-4 text-muted-foreground"
                      />
                    }
                  >
                  </TooltipTrigger>
                  <TooltipContent>
                    Unique identifier for the skill. Auto-generated from name.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="slug"
              placeholder="authentication-flow"
              value={formData.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="Brief description of what this skill does"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>

        {/* Triggers */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Triggers</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={
                  <HugeiconsIcon
                    icon={InformationCircleIcon}
                    className="size-4 text-muted-foreground"
                  />
                }>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Keywords that activate this skill. When a user message
                  contains any of these words, this skill will be included in
                  the agent&apos;s context.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add trigger keyword..."
              value={triggerInput}
              onChange={(e) => setTriggerInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addTrigger}>
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
            </Button>
          </div>

          {formData.triggers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {formData.triggers.map((trigger) => (
                <Badge
                  key={trigger}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {trigger}
                  <button
                    type="button"
                    onClick={() => removeTrigger(trigger)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content with Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>
              Instructions <span className="text-destructive">*</span>
            </Label>

            {/* Template Selector */}
            {!isEditing && (
              <Select onValueChange={(value) => applyTemplate(value as string)}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue>Use template</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SKILL_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
            <TabsList className="mb-2">
              <TabsTrigger value="edit" className="gap-1.5">
                <HugeiconsIcon icon={CodeIcon} className="size-3.5" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5">
                <HugeiconsIcon icon={ViewIcon} className="size-3.5" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="mt-0">
              <Textarea
                placeholder="Write the instructions that will guide the AI agent when this skill is activated...

Use markdown formatting:
- **Bold** for emphasis
- `code` for technical terms
- Code blocks for examples"
                value={formData.content}
                onChange={(e) => handleChange("content", e.target.value)}
                className="min-h-[300px] font-mono text-sm resize-none"
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              <div className="min-h-[300px] rounded-md border border-border bg-muted/30 p-4 prose prose-sm dark:prose-invert max-w-none overflow-auto">
                {formData.content ? (
                  <MarkdownPreview content={formData.content} />
                ) : (
                  <p className="text-muted-foreground italic">
                    No content to preview. Write instructions in the Edit tab.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isLoading}>
          {isLoading ? "Saving..." : isEditing ? "Save Changes" : "Create Skill"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Simple markdown preview component
 */
function MarkdownPreview({ content }: { content: string }) {
  // Basic markdown rendering (could be replaced with a proper markdown library)
  const rendered = React.useMemo(() => {
    let html = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-md overflow-x-auto my-2"><code class="text-xs">$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
      // Lists
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4">$2</li>')
      // Line breaks
      .replace(/\n/g, '<br />');

    return html;
  }, [content]);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: rendered }}
      className="text-sm leading-relaxed"
    />
  );
}
