import Together from "together-ai";
import { Logger } from './logger';
import { TOGETHER_API_KEY, LLM_CONFIG, SYSTEM_PROMPTS, validateConfig } from './config';

export class LLMService {
  private together: Together;
  private logger: Logger;
  private isAvailable: boolean;

  constructor(logger: Logger) {
    this.logger = logger;
    this.isAvailable = validateConfig();
    
    if (!this.isAvailable) {
      this.logger.warn('WARNING: TOGETHER_API_KEY environment variable is not set. LLM features will be disabled.');
    }
    
    // Create Together.ai client
    this.together = new Together({
      apiKey: TOGETHER_API_KEY
    });
  }

  // Get code suggestions from the LLM model for auto-completion
  async getSuggestionsFromLLM(codeContext: string): Promise<string | null> {
    this.logger.log("Getting code completion suggestions from LLM");
    
    // Return early if API key is not set
    if (!this.isAvailable) {
      this.logger.warn("Skipping LLM request because TOGETHER_API_KEY is not set");
      return null;
    }
    
    try {
      const response = await this.together.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPTS.codeSuggestion },
          { role: "user", content: codeContext }
        ],
        model: LLM_CONFIG.model,
        temperature: LLM_CONFIG.temperature,
        max_tokens: LLM_CONFIG.max_tokens
      });

      const suggestion: string = response.choices?.[0]?.message?.content || "";
      this.logger.log("LLM suggestion received");
      return suggestion;
    } catch (error) {
      this.logger.error(`Error getting LLM suggestions: ${error}`);
      return null;
    }
  }
}