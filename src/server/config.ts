import * as process from "process";

// API key for Together.ai
export const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || "";

// LLM model configuration
export const LLM_CONFIG = {
  model: "Qwen/Qwen2.5-Coder-32B-Instruct",
  temperature: 0.7,
  max_tokens: 512,
};

export const SYSTEM_PROMPT = {
  codeSuggestion: `You are an expert Python coding assistant.

IMPORTANT:
- ONLY provide concise, idiomatic Python code that logically completes the provided context.
- NEVER repeat, reference, or rephrase the provided context.
- NEVER use markdown formatting (no backticks, no comments, no explanations).

Your response must strictly advance the provided code snippet by directly printing the next logical lines. Always remain consistent with variable names, function signatures, and coding style from the context.`,
};

// Check if API key is available
export function validateConfig(): boolean {
  return TOGETHER_API_KEY !== "";
}
