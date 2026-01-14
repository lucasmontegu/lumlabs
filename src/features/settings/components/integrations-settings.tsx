"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Github01Icon,
  GitlabIcon,
  Link01Icon,
  Delete01Icon,
  Add01Icon,
  CheckmarkCircle02Icon,
  Settings01Icon,
  CodeIcon,
} from "@hugeicons/core-free-icons";
import { Database, FileText, Globe, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GitConnection {
  id: string;
  provider: string;
  username?: string;
  connectedAt: string;
}

interface IntegrationsSettingsProps {
  organizationId: string;
  gitConnections: GitConnection[];
  isAdmin: boolean;
}

const gitProviders = [
  {
    id: "github",
    name: "GitHub",
    icon: Github01Icon,
    description: "Connect to GitHub repositories",
    color: "bg-[#24292e]",
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: GitlabIcon,
    description: "Connect to GitLab repositories",
    color: "bg-[#FC6D26]",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    icon: CodeIcon,
    description: "Connect to Bitbucket repositories",
    color: "bg-[#0052CC]",
  },
];

// Mock MCP servers for now
const mcpServers: { id: string; name: string; description: string; icon: LucideIcon; status: string }[] = [
  {
    id: "filesystem",
    name: "File System",
    description: "Read and write files in your workspace",
    icon: FileText,
    status: "available",
  },
  {
    id: "database",
    name: "Database",
    description: "Query and modify database schemas",
    icon: Database,
    status: "available",
  },
  {
    id: "browser",
    name: "Browser Automation",
    description: "Automate web browser interactions",
    icon: Globe,
    status: "coming_soon",
  },
];

export function IntegrationsSettings({
  organizationId,
  gitConnections,
  isAdmin,
}: IntegrationsSettingsProps) {
  const router = useRouter();
  const [addMcpOpen, setAddMcpOpen] = React.useState(false);
  const [mcpUrl, setMcpUrl] = React.useState("");
  const [mcpName, setMcpName] = React.useState("");

  const getProviderIcon = (provider: string) => {
    const providerData = gitProviders.find((p) => p.id === provider);
    return providerData?.icon || Link01Icon;
  };

  const getProviderName = (provider: string) => {
    const providerData = gitProviders.find((p) => p.id === provider);
    return providerData?.name || provider;
  };

  const handleConnectGit = (providerId: string) => {
    // Redirect to OAuth flow
    window.location.href = `/api/git/connect/${providerId}`;
  };

  const handleDisconnectGit = async (connectionId: string) => {
    try {
      const res = await fetch(`/api/git/connections/${connectionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const connectedProviders = gitConnections.map((c) => c.provider);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Integrations</h2>
        <p className="text-muted-foreground">
          Connect external services and configure MCP servers
        </p>
      </div>

      {/* Git Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Git Providers</CardTitle>
          <CardDescription>
            Connect your Git accounts to import and work with repositories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {gitProviders.map((provider) => {
            const connection = gitConnections.find(
              (c) => c.provider === provider.id
            );
            const isConnected = !!connection;

            return (
              <div
                key={provider.id}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex size-12 items-center justify-center rounded-xl ${provider.color} text-white`}
                  >
                    <HugeiconsIcon icon={provider.icon} className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{provider.name}</p>
                      {isConnected && (
                        <Badge variant="secondary" className="gap-1">
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            className="size-3"
                          />
                          Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isConnected
                        ? `@${connection.username} • Connected ${formatDate(
                            connection.connectedAt
                          )}`
                        : provider.description}
                    </p>
                  </div>
                </div>
                <div>
                  {isConnected ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnectGit(connection.id)}
                    >
                      <HugeiconsIcon icon={Delete01Icon} className="size-4" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnectGit(provider.id)}
                    >
                      <HugeiconsIcon icon={Link01Icon} className="size-4" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* MCP Servers */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>MCP Servers</CardTitle>
              <CardDescription>
                Model Context Protocol servers extend AI agent capabilities
              </CardDescription>
            </div>
            <Dialog open={addMcpOpen} onOpenChange={setAddMcpOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
                Add Server
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add MCP Server</DialogTitle>
                  <DialogDescription>
                    Connect a custom MCP server to extend AI capabilities
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="mcp-name">Server Name</Label>
                    <Input
                      id="mcp-name"
                      placeholder="My Custom Server"
                      value={mcpName}
                      onChange={(e) => setMcpName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mcp-url">Server URL</Label>
                    <Input
                      id="mcp-url"
                      placeholder="https://mcp.example.com"
                      value={mcpUrl}
                      onChange={(e) => setMcpUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the URL of your MCP server endpoint
                    </p>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="ghost"
                      onClick={() => setAddMcpOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={!mcpName.trim() || !mcpUrl.trim()}
                      onClick={() => {
                        // TODO: Implement MCP server connection
                        setAddMcpOpen(false);
                        setMcpName("");
                        setMcpUrl("");
                      }}
                    >
                      Add Server
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mcpServers.map((server) => (
            <div
              key={server.id}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                  <server.icon className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{server.name}</p>
                    {server.status === "coming_soon" && (
                      <Badge variant="outline" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {server.description}
                  </p>
                </div>
              </div>
              <div>
                {server.status === "available" ? (
                  <Button variant="outline" size="sm">
                    <HugeiconsIcon icon={Settings01Icon} className="size-4" />
                    Configure
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" disabled>
                    Coming Soon
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Configure webhooks to receive notifications about events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-8">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon
                icon={Link01Icon}
                className="size-6 text-muted-foreground"
              />
            </div>
            <div className="text-center">
              <p className="font-medium">No webhooks configured</p>
              <p className="text-sm text-muted-foreground">
                Add a webhook to receive notifications
              </p>
            </div>
            <Button variant="outline">
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              Add Webhook
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
