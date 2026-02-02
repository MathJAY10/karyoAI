// Quick test to verify ChromaDB connection
const {
    ChromaClient
} = require('chromadb');

async function testChromaConnection() {
    try {
        console.log('🔍 Testing ChromaDB connection...');

        const client = new ChromaClient({
            host: 'localhost',
            port: 8000
        });

        // Test heartbeat
        const heartbeat = await client.heartbeat();
        console.log('✅ ChromaDB is alive! Heartbeat:', heartbeat);

        // List collections
        const collections = await client.listCollections();
        console.log('📚 Existing collections:', collections.length);

        console.log('\n✅ All tests passed! ChromaDB is ready to use.');
        console.log('\n📦 Installed packages:');
        console.log('   ✓ chromadb - Vector database client');
        console.log('   ✓ pdf-parse - PDF text extraction');
        console.log('   ✓ xlsx - Excel file parsing');
        console.log('   ✓ multer - File upload handling');
        console.log('   ✓ uuid - Unique ID generation');
    } catch (error) {
        console.error('❌ Error connecting to ChromaDB:', error.message);
        console.error('\nMake sure ChromaDB is running:');
        console.error('  cd llm-service && docker-compose up -d');
    }
}

testChromaConnection();