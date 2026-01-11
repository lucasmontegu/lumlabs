/**
 * Ably Realtime Client Configuration
 *
 * Provides real-time capabilities for:
 * - Presence: Who's online in workspace/session
 * - Agent streaming: Real-time AI response streaming
 * - Status updates: Session status changes (planning → building → ready)
 * - Approvals: Plan approval notifications
 *
 * Channel naming convention:
 * - workspace:{orgId}:presence     → Who's online in workspace
 * - session:{sessionId}:stream     → OpenCode streaming (AI responses)
 * - session:{sessionId}:status     → Status changes
 * - session:{sessionId}:approvals  → Approval notifications
 */

import * as Ably from "ably";

const ABLY_API_KEY = process.env.ABLY_API_KEY || "";

/**
 * Server-side Ably REST client for publishing messages
 */
class AblyServerClient {
  private client: Ably.Rest | null = null;

  private getClient(): Ably.Rest {
    if (!this.client) {
      if (!ABLY_API_KEY) {
        throw new Error("ABLY_API_KEY environment variable is not set");
      }
      this.client = new Ably.Rest({ key: ABLY_API_KEY });
    }
    return this.client;
  }

  /**
   * Generate a token request for client authentication
   */
  async createTokenRequest(
    clientId: string,
    capability?: Record<string, Ably.capabilityOp[]>
  ): Promise<Ably.TokenRequest> {
    const client = this.getClient();

    // Default capability allows subscribing to session and workspace channels
    const defaultCapability: Record<string, Ably.capabilityOp[]> = {
      "workspace:*:presence": ["presence", "subscribe"],
      "session:*:*": ["subscribe", "publish"],
    };

    return client.auth.createTokenRequest({
      clientId,
      capability: capability || defaultCapability,
    });
  }

  /**
   * Publish a message to a channel
   */
  async publish(
    channelName: string,
    eventName: string,
    data: unknown
  ): Promise<void> {
    const client = this.getClient();
    const channel = client.channels.get(channelName);
    await channel.publish(eventName, data);
  }

  /**
   * Publish agent streaming event
   */
  async publishAgentEvent(
    sessionId: string,
    event: {
      type: "chunk" | "tool_call" | "tool_result" | "error" | "done";
      content?: string;
      toolCall?: {
        id: string;
        name: string;
        arguments: Record<string, unknown>;
        result?: string;
      };
      error?: string;
    }
  ): Promise<void> {
    await this.publish(`session:${sessionId}:stream`, "agent-event", event);
  }

  /**
   * Publish session status change
   */
  async publishStatusChange(
    sessionId: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.publish(`session:${sessionId}:status`, "status-change", {
      status,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Publish approval event
   */
  async publishApprovalEvent(
    sessionId: string,
    event: {
      type: "requested" | "approved" | "rejected";
      approvalId: string;
      messageId: string;
      reviewerId?: string;
      comment?: string;
    }
  ): Promise<void> {
    await this.publish(`session:${sessionId}:approvals`, "approval-event", {
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publish chat message to session participants
   */
  async publishChatMessage(
    sessionId: string,
    message: {
      id: string;
      userId: string;
      userName: string;
      userImage?: string;
      role: "user" | "assistant" | "system";
      content: string;
      mentions?: Array<{
        type: "user" | "agent" | "integration";
        userId?: string;
        userName?: string;
        agentType?: string;
      }>;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.publish(`session:${sessionId}:chat`, "message", {
      ...message,
      sessionId,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Publish mention notification to specific user
   */
  async publishMentionNotification(
    userId: string,
    notification: {
      sessionId: string;
      sessionName: string;
      mentionedBy: string;
      mentionedByImage?: string;
      messagePreview: string;
      timestamp: string;
    }
  ): Promise<void> {
    await this.publish(`user:${userId}:notifications`, "mention", notification);
  }
}

// Export singleton instance for server-side use
export const ablyServer = new AblyServerClient();

// Channel name helpers
export const getWorkspacePresenceChannel = (orgId: string) =>
  `workspace:${orgId}:presence`;
export const getSessionStreamChannel = (sessionId: string) =>
  `session:${sessionId}:stream`;
export const getSessionStatusChannel = (sessionId: string) =>
  `session:${sessionId}:status`;
export const getSessionApprovalsChannel = (sessionId: string) =>
  `session:${sessionId}:approvals`;
export const getSessionChatChannel = (sessionId: string) =>
  `session:${sessionId}:chat`;
export const getUserNotificationsChannel = (userId: string) =>
  `user:${userId}:notifications`;
