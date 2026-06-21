import prisma from '../lib/prisma';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://localhost:8000';

async function repairMemoryEmbeddings() {
  console.log('[MEMORY_REPAIR] Starting MemoryFact repair process...');

  try {
    // 1. Fetch all stranded facts
    const strandedFacts = await prisma.memoryFact.findMany({
      where: {
        OR: [
          { embeddingStatus: 'PENDING' },
          { embeddingStatus: 'FAILED' }
        ]
      }
    });

    console.log(`[MEMORY_REPAIR] Found ${strandedFacts.length} stranded facts.`);

    if (strandedFacts.length === 0) {
      console.log('[MEMORY_REPAIR] No repair needed. Exiting.');
      return;
    }

    // 2. Re-process
    let successCount = 0;
    let failCount = 0;

    for (const fact of strandedFacts) {
      try {
        console.log(`[MEMORY_REPAIR] Attempting to embed fact ID ${fact.id}...`);
        
        await axios.post(`${LLM_SERVICE_URL}/internal/memory/embed`, {
          memoryFactId: fact.id,
          userId: fact.userId,
          sessionId: fact.sourceChatSessionId || 0,
          content: fact.content
        });

        // Update Postgres
        await prisma.memoryFact.update({
          where: { id: fact.id },
          data: { embeddingStatus: 'INDEXED' }
        });

        console.log(`[MEMORY_REPAIR] Successfully repaired embedding for fact: ${fact.id}`);
        successCount++;
      } catch (err: any) {
        console.error(`[CRITICAL] Failed to repair fact ${fact.id}:`, err.message);
        
        // Ensure status is marked FAILED if it was PENDING
        if (fact.embeddingStatus === 'PENDING') {
          await prisma.memoryFact.update({
            where: { id: fact.id },
            data: { embeddingStatus: 'FAILED' }
          });
        }
        failCount++;
      }
    }

    console.log(`[MEMORY_REPAIR] Repair process complete. Success: ${successCount}, Failed: ${failCount}`);
  } catch (globalError: any) {
    console.error('[CRITICAL] Global error during repair process:', globalError.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  repairMemoryEmbeddings();
}

export default repairMemoryEmbeddings;
