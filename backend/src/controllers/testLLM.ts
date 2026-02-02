import { Request, Response } from 'express';
import { llmService } from '../services/llmService';

export const testLLMConnection = async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing LLM service connection...');
    
    // Simple health check first
    const health = await llmService.checkHealth();
    console.log('✅ Health check passed:', health);
    
    // Try a very short generation
    const result = await llmService.simpleCompletion(
      'Say only "Hi"',
      'You are a test bot. Be brief.',
      0.7,
      10  // Only 10 tokens
    );
    
    console.log('✅ LLM generation successful:', result);
    
    res.json({
      success: true,
      health,
      result,
      message: 'LLM service is working!'
    });
  } catch (error: any) {
    console.error('❌ LLM test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
