/**
 * LLM Service - Node.js wrapper for self-hosted LLM
 * 
 * This service replaces OpenAI API calls with requests to our FastAPI LLM microservice.
 * It provides a simple interface for chat completions that mirrors OpenAI's structure.
 * 
 * Features:
 * - Chat completion with message history
 * - Health check for LLM service availability
 * - Error handling and retry logic
 * - TypeScript types for type safety
 */

import axios, { AxiosInstance } from 'axios';

// LLM Service Configuration
const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://localhost:8001';
const LLM_TIMEOUT = parseInt(process.env.LLM_TIMEOUT || '180000'); // 3 minutes default (model loading can be slow)

/**
 * Message structure for chat conversations
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Request payload for chat completion
 */
interface ChatCompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

/**
 * Response from LLM service
 */
interface ChatCompletionResponse {
  response: string;  // FastAPI returns "response" not "content"
  model: string;
  tokens_used?: number;
}

/**
 * Health check response
 */
interface HealthCheckResponse {
  status: string;
  model: string;
  ollama_url: string;
}

/**
 * LLM Service Client
 * 
 * Handles communication with the FastAPI LLM microservice.
 * Provides methods for chat completion and health checks.
 */
class LLMService {
  private client: AxiosInstance;

  constructor() {
    // Create axios instance with timeout
    this.client = axios.create({
      baseURL: `${LLM_SERVICE_URL}/api/llm`,
      timeout: LLM_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if LLM service is healthy and ready
   * 
   * @returns Health status with model info
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    try {
      const response = await this.client.get<HealthCheckResponse>('/health');
      return response.data;
    } catch (error: any) {
      throw new Error(`LLM service health check failed: ${error.message}`);
    }
  }

  /**
   * Generate chat completion with message history
   * 
   * @param messages - Array of chat messages (system, user, assistant)
   * @param temperature - Randomness (0.0-1.0), default 0.7
   * @param maxTokens - Max response length, default 500
   * @returns Generated response text
   */
  async chatCompletion(
    messages: ChatMessage[],
    temperature: number = 0.7,
    maxTokens: number = 500
  ): Promise<string> {
    try {
      const payload: ChatCompletionRequest = {
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      console.log('🔵 Sending request to LLM service:', `${LLM_SERVICE_URL}/api/llm/chat`);
      console.log('🔵 Payload:', JSON.stringify(payload, null, 2));
      
      const response = await this.client.post<ChatCompletionResponse>('/chat', payload);
      
      console.log('✅ LLM service response received:', response.data);
      return response.data.response;  // Changed from content to response
    } catch (error: any) {
      // Handle different error types
      console.error('❌ LLM service error:', error.code, error.message);
      
      if (error.response) {
        // Server responded with error status
        console.error('❌ Response error:', error.response.status, error.response.data);
        throw new Error(
          `LLM service error (${error.response.status}): ${
            error.response.data?.detail || error.message
          }`
        );
      } else if (error.request) {
        // Request made but no response
        console.error('❌ No response from LLM service. Error code:', error.code);
        throw new Error('LLM service is not responding. Please check if it is running.');
      } else {
        // Something else went wrong
        throw new Error(`Failed to generate response: ${error.message}`);
      }
    }
  }

  /**
   * Simple completion with a single prompt
   * 
   * Convenience method for single-turn completions without message history.
   * 
   * @param prompt - User prompt text
   * @param systemPrompt - Optional system instruction
   * @param temperature - Randomness (0.0-1.0)
   * @param maxTokens - Max response length
   * @returns Generated response text
   */
  async simpleCompletion(
    prompt: string,
    systemPrompt?: string,
    temperature: number = 0.7,
    maxTokens: number = 500
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    // Add system message if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add user prompt
    messages.push({
      role: 'user',
      content: prompt,
    });

    return this.chatCompletion(messages, temperature, maxTokens);
  }

  /**
   * Generate email content with specific instructions
   * 
   * Specialized method for email generation features.
   * 
   * @param userRequest - What the user wants in the email
   * @param context - Additional context (tone, length, etc.)
   * @returns Generated email content
   */
  async generateEmail(userRequest: string, context?: string): Promise<string> {
    const systemPrompt = `You are an expert email writer. Generate professional, clear, and engaging emails based on user requests. ${
      context || ''
    }`;

    return this.simpleCompletion(userRequest, systemPrompt, 0.8, 800);
  }

  /**
   * Analyze and improve text
   * 
   * Used for tone polishing, subject line optimization, etc.
   * 
   * @param text - Text to analyze/improve
   * @param instruction - What to do with the text
   * @returns Improved text
   */
  async improveText(text: string, instruction: string): Promise<string> {
    const systemPrompt = 'You are an expert content editor and writer.';
    const prompt = `${instruction}\n\nText: ${text}`;

    return this.simpleCompletion(prompt, systemPrompt, 0.7, 500);
  }
}

// Export singleton instance
export const llmService = new LLMService();

// Export types for use in controllers
export type { ChatMessage, ChatCompletionRequest, ChatCompletionResponse };
