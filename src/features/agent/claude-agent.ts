/**
 * Claude Agent Service for Plan Generation
 *
 * Uses the Claude API directly for plan generation.
 * Building phase uses the existing Daytona + Claude Agent SDK integration.
 */

export interface PlanResult {
  summary: string;
  changes: Array<{
    description: string;
    files?: string[];
  }>;
  considerations?: string[];
}

export interface AgentContext {
  repoName: string;
  repoUrl: string;
  branch: string;
  techStack?: string[];
  existingFiles?: string[];
}

/**
 * Generate a plan for a feature request using Claude API
 */
export async function generatePlan(
  userRequest: string,
  context: AgentContext
): Promise<PlanResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const systemPrompt = `You are a product planning assistant for a software development platform. Your job is to understand feature requests and create clear, actionable plans.

## Project Context
- Repository: ${context.repoName}
- Branch: ${context.branch}
- Tech Stack: ${context.techStack?.join(", ") || "Unknown"}

## Instructions
1. Understand what the user wants to achieve
2. Create a plan in plain language that a non-technical person can understand
3. Focus on WHAT will be built, not HOW (no code)
4. List the files that will likely be changed

## Output Format
Respond with a JSON object:
{
  "summary": "One sentence describing the feature",
  "changes": [
    { "description": "User-visible change 1", "files": ["file1.tsx"] },
    { "description": "User-visible change 2", "files": ["file2.tsx"] }
  ],
  "considerations": ["Any important notes or questions"]
}

IMPORTANT: Respond ONLY with valid JSON, no markdown or explanation.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userRequest,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();

  // Extract text content
  const textContent = data.content?.find(
    (c: { type: string }) => c.type === "text"
  );
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON response
  try {
    const plan = JSON.parse(textContent.text) as PlanResult;
    return plan;
  } catch {
    // If JSON parsing fails, create a simple plan from the text
    return {
      summary: textContent.text.slice(0, 200),
      changes: [{ description: "Implement the requested feature" }],
      considerations: ["Plan could not be parsed - review manually"],
    };
  }
}

/**
 * Stream a message from Claude (for building phase - placeholder)
 * Actual building uses the Daytona + Claude Agent SDK via agent-provider
 */
export async function* streamBuildProgress(
  plan: PlanResult,
  _context: AgentContext
): AsyncGenerator<{ type: string; content: string }> {
  // This is a placeholder - actual implementation uses ClaudeAgentProvider
  // which runs Claude Agent SDK inside Daytona sandboxes

  yield { type: "start", content: "Starting build..." };

  for (const change of plan.changes) {
    yield { type: "file", content: change.files?.[0] || "unknown" };
    // Simulate work
    await new Promise((r) => setTimeout(r, 1000));
    yield { type: "done", content: change.files?.[0] || "unknown" };
  }

  yield { type: "complete", content: "Build complete" };
}
