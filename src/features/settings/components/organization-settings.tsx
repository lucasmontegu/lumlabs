"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Image01Icon,
  Loading03Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { organization } from "@/lib/auth-client";

interface OrganizationSettingsProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  isOwner: boolean;
  isAdmin: boolean;
}

export function OrganizationSettings({
  organization: org,
  isOwner,
  isAdmin,
}: OrganizationSettingsProps) {
  const router = useRouter();
  const [name, setName] = React.useState(org.name);
  const [slug, setSlug] = React.useState(org.slug);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const hasChanges = name !== org.name || slug !== org.slug;

  const handleSave = async () => {
    if (!hasChanges || !isAdmin) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await organization.update({
        organizationId: org.id,
        data: {
          name,
          slug,
        },
      });
      setSaveSuccess(true);

      // If slug changed, redirect to new URL
      if (slug !== org.slug) {
        router.replace(`/w/${slug}/settings/organization`);
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update organization");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate slug from name
  const handleNameChange = (newName: string) => {
    setName(newName);
    // Auto-update slug if it hasn't been manually changed
    if (slug === org.slug || slug === generateSlug(name)) {
      setSlug(generateSlug(newName));
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Organization</h2>
        <p className="text-muted-foreground">
          Manage your workspace settings and branding
        </p>
      </div>

      {/* Read-only notice for non-admins */}
      {!isAdmin && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
          <HugeiconsIcon icon={InformationCircleIcon} className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">View Only</p>
            <p className="text-sm opacity-80">
              You don't have permission to edit organization settings. Contact an admin to make changes.
            </p>
          </div>
        </div>
      )}

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar size="lg" className="size-20">
                <AvatarImage src={org.logo} alt={org.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getInitials(org.name)}
                </AvatarFallback>
              </Avatar>
              {isAdmin && (
                <button
                  type="button"
                  className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background transition-transform hover:scale-105"
                >
                  <HugeiconsIcon icon={Image01Icon} className="size-4" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Organization Logo</p>
              <p className="text-xs text-muted-foreground">
                Square image, at least 200x200px
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter organization name"
              disabled={!isAdmin}
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="org-slug">URL Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                vibecode.app/w/
              </span>
              <Input
                id="org-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="my-org"
                className="flex-1"
                disabled={!isAdmin}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This is used in your workspace URL. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Save Button */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <>
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      className="size-4 animate-spin"
                    />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      className="size-4"
                    />
                    Saved
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              {hasChanges && !isSaving && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setName(org.name);
                    setSlug(org.slug);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle>Billing & Usage</CardTitle>
          <CardDescription>
            Manage your subscription and view usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="font-medium">Free Plan</p>
              <p className="text-sm text-muted-foreground">
                10,000 tokens/month • 3 team members
              </p>
            </div>
            <Button variant="outline">Upgrade</Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="font-medium">Delete Organization</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this workspace and all its data
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Delete Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
