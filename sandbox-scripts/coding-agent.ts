/**
 * Coding Agent - Runs inside Daytona sandbox
 * Uses Claude Agent SDK (TypeScript) to execute coding tasks
 *
 * This file is uploaded to the sandbox and executed via code interpreter
 */

import { query, type ClaudeAgentOptions } from "@anthropic-ai/claude-agent-sdk";

// System prompt that enforces plan mode for non-technical users
const SYSTEM_PROMPT = `You are a product builder assistant helping non-technical users build features for their applications.

## Your Role
- You help users describe and build features in plain language
- You NEVER show code directly to users - only results and previews
- You communicate in simple, non-technical language

## MANDATORY: Plan Mode
Before making ANY changes, you MUST:
1. Understand what the user wants to achieve
2. Ask clarifying questions if the request is ambiguous
3. Present a plan in plain language explaining:
   - What you will do (in user-friendly terms)
   - What files will be affected (just names, no technical details)
   - What the user will see when it's done
4. Wait for explicit approval before proceeding

## Plan Format
When presenting a plan, use this format:

**What I'll do:**
- [Simple description of each change]

**Files I'll modify:**
- [filename] - [one line description]

**When it's done, you'll see:**
- [Description of the visible result]

Do you want me to proceed with this plan?

## During Build
- Provide progress updates in plain language
- Focus on what's happening, not how
- If something fails, explain the issue simply and suggest solutions

## Communication Style
- Use simple, friendly language
- Avoid technical jargon (no "components", "state", "props", etc.)
- Focus on what the user will SEE and EXPERIENCE
- Use analogies to familiar concepts when explaining`;

// Agent options configuration
const DEFAULT_OPTIONS: ClaudeAgentOptions = {
  allowedTools: ["Read", "Edit", "Write", "Glob", "Grep", "Bash"],
  permissionMode: "acceptEdits",
  systemPrompt: SYSTEM_PROMPT,
};

/**
 * Message types emitted by the agent
 */
export type AgentMessageType =
  | "thinking"
  | "plan"
  | "question"
  | "progress"
  | "result"
  | "error"
  | "tool_use"
  | "text";

export interface AgentMessage {
  type: AgentMessageType;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Run a query through the coding agent
 * Streams messages to stdout for the parent process to capture
 */
export async function runQuery(
  prompt: string,
  workingDirectory: string = "/workspace/repo",
  previewUrl?: string
): Promise<void> {
  const options: ClaudeAgentOptions = {
    ...DEFAULT_OPTIONS,
    cwd: workingDirectory,
  };

  // Add preview URL context if available
  if (previewUrl) {
    options.systemPrompt = `${SYSTEM_PROMPT}

## Preview URL
The user can see a live preview of their application at: ${previewUrl}
When you make changes, remind them to check the preview to see the results.`;
  }

  try {
    for await (const message of query({ prompt, options })) {
      // Parse and emit structured messages
      const agentMessage = parseAgentMessage(message);

      // Output as JSON for the parent process to parse
      console.log(JSON.stringify(agentMessage));
    }
  } catch (error) {
    const errorMessage: AgentMessage = {
      type: "error",
      content: error instanceof Error ? error.message : "Unknown error occurred",
    };
    console.log(JSON.stringify(errorMessage));
  }
}

/**
 * Parse raw agent SDK message into structured format
 */
function parseAgentMessage(message: unknown): AgentMessage {
  // Handle different message types from Claude Agent SDK
  if (typeof message === "object" && message !== null) {
    const msg = message as Record<string, unknown>;

    // System messages (init, etc.)
    if (msg.type === "system") {
      return {
        type: "thinking",
        content: String(msg.subtype || "initializing"),
        metadata: msg,
      };
    }

    // Assistant text messages
    if (msg.type === "assistant" && msg.message) {
      const assistantMsg = msg.message as Record<string, unknown>;
      if (assistantMsg.content) {
        const content = assistantMsg.content;
        if (Array.isArray(content)) {
          const textContent = content.find((c: unknown) =>
            typeof c === "object" && c !== null && (c as Record<string, unknown>).type === "text"
          );
          if (textContent) {
            const text = String((textContent as Record<string, unknown>).text || "");
            return {
              type: detectMessageType(text),
              content: text,
            };
          }
        }
      }
    }

    // Tool use messages
    if (msg.type === "tool_use" || (msg.type === "assistant" && msg.tool_use)) {
      return {
        type: "tool_use",
        content: "Working...",
        metadata: msg,
      };
    }

    // Result messages
    if (msg.type === "result") {
      return {
        type: "result",
        content: String(msg.result || "Done"),
        metadata: msg,
      };
    }
  }

  // Fallback for string messages
  if (typeof message === "string") {
    return {
      type: "text",
      content: message,
    };
  }

  // Default fallback
  return {
    type: "text",
    content: JSON.stringify(message),
  };
}

/**
 * Detect the type of message based on content
 */
function detectMessageType(text: string): AgentMessageType {
  const lowerText = text.toLowerCase();

  // Check for plan indicators
  if (
    lowerText.includes("what i'll do") ||
    lowerText.includes("plan:") ||
    lowerText.includes("here's my plan") ||
    lowerText.includes("i propose")
  ) {
    return "plan";
  }

  // Check for questions
  if (
    text.includes("?") &&
    (lowerText.includes("do you want") ||
     lowerText.includes("should i") ||
     lowerText.includes("would you like") ||
     lowerText.includes("can you clarify"))
  ) {
    return "question";
  }

  // Check for progress updates
  if (
    lowerText.includes("working on") ||
    lowerText.includes("updating") ||
    lowerText.includes("creating") ||
    lowerText.includes("modifying")
  ) {
    return "progress";
  }

  return "text";
}

/**
 * Synchronous wrapper for runQuery (used by code interpreter)
 */
export function runQuerySync(prompt: string): void {
  const workDir = process.env.WORKSPACE_DIR || "/workspace/repo";
  const previewUrl = process.env.PREVIEW_URL;

  // Run the async function
  runQuery(prompt, workDir, previewUrl).catch((error) => {
    console.log(JSON.stringify({
      type: "error",
      content: error instanceof Error ? error.message : "Unknown error",
    }));
  });
}

// Export for use in sandbox
export default {
  runQuery,
  runQuerySync,
};
