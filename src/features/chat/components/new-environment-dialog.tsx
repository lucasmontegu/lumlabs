"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CloudEnvironment } from "./prompt-composer";
import { generateId } from "@/lib/id";

interface NewEnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEnvironment: (environment: CloudEnvironment) => void;
}

export function NewEnvironmentDialog({
  open,
  onOpenChange,
  onCreateEnvironment,
}: NewEnvironmentDialogProps) {
  const [name, setName] = React.useState("Default");
  const [networkAccess, setNetworkAccess] = React.useState<"trusted" | "restricted" | "none">("trusted");
  const [envVars, setEnvVars] = React.useState(`API_KEY=hunter2

# Multiline values - wrap in quotes
CERT="-----BEGIN CERT-----
MIIE...
-----END CERT-----"`);
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const newEnv: CloudEnvironment = {
        id: generateId("env"),
        name: name.trim(),
        provider: "daytona",
        networkAccess,
        envVars: envVars.trim(),
        isDefault: false,
      };

      onCreateEnvironment(newEnv);
      onOpenChange(false);

      // Reset form
      setName("Default");
      setNetworkAccess("trusted");
      setEnvVars("");
    } catch (error) {
      console.error("Failed to create environment:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-700 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-zinc-100">
              New cloud environment
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200"
              onClick={() => onOpenChange(false)}
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="env-name" className="text-sm text-zinc-300">
              Name
            </Label>
            <Input
              id="env-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Environment name"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          {/* Network Access */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="network-access" className="text-sm text-zinc-300">
                Network access
              </Label>
            </div>
            <p className="text-xs text-zinc-500">
              Learn more about{" "}
              <a href="#" className="text-blue-400 hover:underline">
                security risks
              </a>{" "}
              or review our list of{" "}
              <a href="#" className="text-blue-400 hover:underline">
                trusted sources
              </a>
              .
            </p>
            <Select value={networkAccess} onValueChange={(v) => setNetworkAccess(v as typeof networkAccess)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="trusted" className="text-zinc-100">
                  Trusted
                </SelectItem>
                <SelectItem value="restricted" className="text-zinc-100">
                  Restricted
                </SelectItem>
                <SelectItem value="none" className="text-zinc-100">
                  None
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Environment Variables */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="env-vars" className="text-sm text-zinc-300">
                Environment variables
              </Label>
            </div>
            <p className="text-xs text-zinc-500">
              In{" "}
              <a href="#" className="text-blue-400 hover:underline">
                .env format
              </a>
            </p>
            <Textarea
              id="env-vars"
              value={envVars}
              onChange={(e) => setEnvVars(e.target.value)}
              placeholder="KEY=value"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 font-mono text-sm min-h-[150px]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || isCreating}
              className="bg-zinc-100 text-zinc-900 hover:bg-white"
            >
              {isCreating ? "Creating..." : "Create environment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
