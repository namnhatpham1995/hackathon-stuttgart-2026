import type { Content } from "@google/genai";

import { callGemini } from "@/lib/assessment/gemini";
import type { WorkspaceDirective } from "@/lib/assessment/types";

import { agentTools, executeAgentTool } from "./tools";

/** One Gemini call per round. A sixth tool request is not sent. */
const MAX_ROUNDS = 5;

type Executed = {
  name: string;
  output: Record<string, unknown>;
  directive?: WorkspaceDirective;
};

function systemInstruction(productId: string): string {
  return [
    "You are the ExportReady workspace assistant for the signed-in supplier.",
    "You can only act by calling the provided tools. You cannot send email, open an arbitrary URL, run code, or read another user's product, document, job or report.",
    "An id in a tool argument is checked. If the tool result says not found, tell the user you could not open it. Do not invent the record.",
    "Describe progress and results only from tool results. Do not invent a finding, a quote, a status or a percentage. An assessment is finished only when a tool result says its status is COMPLETED.",
    "Files are chosen by the user. To collect documents, call show_upload_card and wait. Do not start an assessment until the user has finalised the batch.",
    "When a tool result includes a recovery step, tell the user that step.",
    "If the user asks for something you cannot do, say so and call no tool.",
    "Do not poll for job status. One status read is enough. The page updates the job on its own.",
    `The product open in the workspace is ${productId}. Use it unless the user names a different product they own.`,
  ].join(" ");
}

function failureSentence(output: Record<string, unknown>): string {
  if (output.error === "not found") return "I could not open it. It was not found.";
  const message = typeof output.message === "string" ? output.message : null;
  const error = typeof output.error === "string" ? output.error : "That step failed.";
  const recovery = typeof output.recovery === "string" ? output.recovery : "";
  const lead = message ?? error;
  if (recovery.length === 0 || lead.includes(recovery)) return lead;
  return `${lead} ${recovery}`;
}

function actionSentence(item: Executed): string {
  if (item.output.ok !== true) return failureSentence(item.output);
  if (item.name === "navigate_workspace" && item.directive?.type === "navigate") {
    if (item.directive.view === "product") return "Opened the product view.";
    if (item.directive.view === "uploads") return "Opened the uploads view.";
    if (item.directive.view === "report") return "Opened the report view.";
  }
  if (item.name === "show_upload_card") {
    return "The upload card is waiting for you to choose files.";
  }
  if (item.name === "show_report") return "Opened the stored report.";
  if (item.name === "request_replacement") {
    return "Asked you to replace an active document. Choose the file yourself.";
  }
  if (item.name === "get_workflow_state") return "Read the workflow state.";
  if (item.name === "update_product_draft") return "Updated the product draft.";
  if (item.name === "start_assessment") return "Started the assessment.";
  if (item.name === "get_assessment_status") {
    return item.output.status == null
      ? "No assessment has been started."
      : `The assessment status is ${String(item.output.status)}.`;
  }
  return "Completed an action.";
}

/**
 * The user sees tool outcomes. A model sentence that ignores a failure is
 * kept, with the failure in front, so a "done" from the model is not the result.
 */
function replyForTurn(modelText: string | null, executed: Executed[], stopped: boolean): string {
  if (stopped) {
    const done = [...new Set(executed.map(actionSentence))];
    const summary = done.length > 0 ? done.join(" ") : "No action completed.";
    return `Stopped after ${MAX_ROUNDS} actions. ${summary}`;
  }

  const text = modelText?.trim() ?? "";
  const failures = executed
    .filter((item) => item.output.ok !== true)
    .map((item) => failureSentence(item.output));
  if (failures.length === 0) {
    if (text.length > 0) return text;
    return [...new Set(executed.map(actionSentence))].join(" ");
  }
  const missing = failures.filter(
    (sentence) => !text.toLowerCase().includes(sentence.toLowerCase()),
  );
  if (text.length === 0) return failures.join(" ");
  if (missing.length === 0) return text;
  return `${missing.join(" ")} ${text}`;
}

export async function runAssistantTurn(input: {
  userId: string;
  productId: string;
  messages: { role: "user" | "model"; text: string }[];
}): Promise<{ reply: string; directives: WorkspaceDirective[] }> {
  const contents: Content[] = input.messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  }));
  const directives: WorkspaceDirective[] = [];
  const executed: Executed[] = [];

  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    const response = await callGemini({
      systemInstruction: systemInstruction(input.productId),
      contents,
      temperature: 0,
      tools: agentTools,
    });
    if (response.functionCalls.length === 0) {
      return { reply: replyForTurn(response.text, executed, false), directives };
    }

    // Echo the model turn unchanged so function-call ids and thought signatures survive.
    contents.push(response.content);
    const parts: NonNullable<Content["parts"]> = [];
    for (const call of response.functionCalls) {
      const result = await executeAgentTool(input.userId, input.productId, {
        name: call.name,
        args: call.args,
      });
      if (result.directive) directives.push(result.directive);
      executed.push({
        name: call.name ?? "unknown",
        output: result.output,
        directive: result.directive,
      });
      parts.push({
        functionResponse: {
          name: call.name ?? "unknown",
          ...(typeof call.id === "string" ? { id: call.id } : {}),
          response: result.output,
        },
      });
    }
    contents.push({ role: "user", parts });

    if (round === MAX_ROUNDS) {
      return { reply: replyForTurn(null, executed, true), directives };
    }
  }

  return { reply: replyForTurn(null, executed, true), directives };
}
