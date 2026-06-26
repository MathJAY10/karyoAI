import axios from 'axios';
import prisma from '../lib/prisma';
import { llmService } from './llmService';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8001';

export const memoryService = {
  /**
   * Search ChromaDB for relevant memories
   */
  searchMemory: async (query: string, userId: number, memoryType?: string, limit: number = 5): Promise<string[]> => {
    try {
      console.log(`[MEMORY_SEARCH] Query: "${query}" User: ${userId} Type: ${memoryType || 'ALL'}`);
      
      const metadata_filter: any = { userId };
      if (memoryType) {
        metadata_filter.memoryType = memoryType;
      }

      const response = await axios.post(`${FASTAPI_URL}/api/rag/retrieve`, {
        query,
        collection_name: 'memory_facts',
        n_results: limit,
        metadata_filter
      });
      
      const chunks = response.data.chunks || [];
      console.log(`[MEMORY_CONTEXT] Retrieved ${chunks.length} memories`);
      return chunks.map((c: any) => c.text || c.document || (typeof c === 'string' ? c : JSON.stringify(c)));
    } catch (error) {
      console.error('[MEMORY_SEARCH] Search failed:', error);
      return [];
    }
  },

  /**
   * Summarize learnings about a specific topic
   */
  summarizeLearnings: async (topic: string, userId: number): Promise<string> => {
    try {
      console.log(`[MEMORY_SUMMARY] Executing summarization for topic: "${topic}"`);
      const memories = await memoryService.searchMemory(topic, userId, undefined, 10);
      
      if (!memories || memories.length === 0) {
        console.log(`[MEMORY_SUMMARY] No memories found for topic: "${topic}"`);
        return `I don't have any specific memories saved about "${topic}" yet.`;
      }

      const memoryText = memories.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n');
      console.log(`[MEMORY_SUMMARY] Generating LLM summary based on ${memories.length} facts.`);
      
      const prompt = `Based ONLY on the following memories extracted from previous conversations, summarize what the user has learned or discussed regarding "${topic}".

Memories:
${memoryText}

Summary:`;

      const summary = await llmService.simpleCompletion(
        prompt,
        'You are an AI assistant that synthesizes user memories into concise summaries. Never invent information.',
        0.5,
        500
      );

      return summary;
    } catch (error) {
      console.error('[MEMORY_SUMMARY] Summarize failed:', error);
      return `Sorry, I encountered an error while trying to summarize what we've discussed about ${topic}.`;
    }
  },

  /**
   * List the major topics discussed recently
   */
  listKnownTopics: async (userId: number): Promise<string> => {
    try {
      console.log(`[MEMORY_TOPICS] Fetching recent topics from Postgres for User: ${userId}`);
      const facts = await prisma.memoryFact.findMany({
        where: { userId, embeddingStatus: 'INDEXED' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { content: true }
      });

      if (!facts || facts.length === 0) {
        console.log(`[MEMORY_TOPICS] No facts found for User: ${userId}`);
        return "We haven't discussed enough topics yet for me to generate a summary. Let's keep chatting!";
      }

      console.log(`[MEMORY_TOPICS] Analyzing ${facts.length} facts to derive major topics.`);
      const memoryText = facts.map((f: any) => `- ${f.content}`).join('\n');
      
      const prompt = `Analyze the following memory facts extracted from the user's recent conversations.
Group them into 3-5 major topics and present them as a bulleted list.

Memories:
${memoryText}

Major Topics Discussed:`;

      const topics = await llmService.simpleCompletion(
        prompt,
        'You are an AI assistant that analyzes atomic facts to identify major discussion topics.',
        0.5,
        500
      );

      return topics;
    } catch (error) {
      console.error('[MEMORY_TOPICS] List topics failed:', error);
      return "Sorry, I encountered an error while trying to list our known topics.";
    }
  }
};
