import prisma from '../lib/prisma';
import { ingestionQueue } from '../config/bullmq';

const CHROMA_URL = 'http://localhost:8000/api/v2';

async function checkChromaForDocument(documentId: number, userId: number): Promise<boolean> {
  try {
    const collectionsToCheck = ['documents', `user_${userId}_documents`];
    
    // Get all collections
    const collectionsRes = await fetch(`${CHROMA_URL}/tenants/default_tenant/databases/default_database/collections`);
    if (!collectionsRes.ok) {
      console.error('Failed to fetch collections', await collectionsRes.text());
      return false;
    }
    const collectionsData = await collectionsRes.json();
    const collections = collectionsData.value || [];
    
    for (const cName of collectionsToCheck) {
      const coll = collections.find((c: any) => c.name === cName);
      if (!coll) continue;
      
      // Check for both 'documentId' (from llm-service/main.py) and 'document_id' (from other ingestions)
      const queryRes = await fetch(`${CHROMA_URL}/tenants/default_tenant/databases/default_database/collections/${coll.id}/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          where: {
            $or: [
              { documentId: String(documentId) },
              { document_id: String(documentId) }
            ]
          }
        })
      });
      
      if (!queryRes.ok) {
        console.error(`Query failed for collection ${cName}:`, await queryRes.text());
        continue;
      }
      
      const queryData = await queryRes.json();
      if (queryData.ids && queryData.ids.length > 0) {
        return true; // Vectors exist
      }
    }
    return false;
  } catch (error) {
    console.error(`Error checking Chroma for doc ${documentId}:`, error);
    return false;
  }
}

async function run() {
  console.log('Starting Recovery Script...');
  const readyDocs = await prisma.document.findMany({
    where: { 
      status: { in: ['READY', 'FAILED'] }
    }
  });
  
  console.log(`Found ${readyDocs.length} READY documents.`);
  let recoveredCount = 0;
  
  for (const doc of readyDocs) {
    console.log(`Checking doc ${doc.id} (User: ${doc.userId})...`);
    const exists = await checkChromaForDocument(doc.id, doc.userId);
    
    if (exists) {
      console.log(`✅ Document ${doc.id} vectors found in Chroma. Skipping.`);
    } else {
      console.log(`❌ Document ${doc.id} vectors missing. Enqueueing recovery...`);
      
      // Set to pending
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: 'pending' }
      });
      
      // Enqueue
      await ingestionQueue.add('process', {
        documentId: doc.id,
        filePath: doc.filePath
      });
      
      recoveredCount++;
      console.log(`   Job added for document ${doc.id}.`);
    }
  }
  
  console.log(`Recovery script complete. Enqueued ${recoveredCount} documents for re-ingestion.`);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
