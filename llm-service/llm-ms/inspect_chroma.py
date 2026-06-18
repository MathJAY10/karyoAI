import chromadb
try:
    client = chromadb.HttpClient(host='localhost', port=8000)
    collections = client.list_collections()
    print('COLLECTIONS:')
    for c in collections:
        print(f'- {c.name}: {c.count()} chunks')
    
    for c_name in ['documents', 'user_1_documents']:
        try:
            coll = client.get_collection(c_name)
            results = coll.get(where={'documentId': '15'})
            print(f'\nDocument 15 in [{c_name}]: {len(results["ids"])} chunks')
        except Exception as e:
            print(f'\nCollection [{c_name}] check failed: {e}')
except Exception as e:
    print(f'Error connecting to Chroma: {e}')
