from app.mcp.server import mcp
from app.services.chroma_service import chroma_service
from app.services.embedding_service import embedding_service
import logging

logger = logging.getLogger(__name__)

# Hardcoded for single-user self-hosted environments
DEFAULT_USER_ID = 1

@mcp.tool()
async def recall_core_memories(query: str)  :
    """
    Search the user's core permanent memory graph for identity, preferences, projects, goals, decisions, or constraints.
    Does NOT return interests.
    
    Args:
        query: The semantic search query to look for in the user's core memory.
    """
    where_filter = {
        "$and": [
            {"userId": DEFAULT_USER_ID},
            {"memoryType": {"$in": ["IDENTITY", "PREFERENCE", "PROJECT", "GOAL", "DECISION", "CONSTRAINT"]}}
        ]
    }
    logger.info(f"[MCP_TOOL] recall_core_memories: query='{query}' filter={where_filter}")
    
    try:
        try:
            chroma_service.get_collection("memory_facts")
        except Exception:
            return f"No memories found for query: '{query}'"
            
        embedding = await embedding_service.generate_embedding(query)
        
        results = chroma_service.query(
            collection_name="memory_facts",
            query_embeddings=[embedding],
            n_results=5,
            where=where_filter
        )
        
        documents = results.get("documents", [[]])[0]
        if not documents:
            return f"No memories found for query: '{query}'"
            
        facts_text = "\n".join([f"- {doc}" for doc in documents])
        return f"Found the following core facts:\n{facts_text}"
        
    except Exception as e:
        safe_error = str(e).encode('ascii', 'ignore').decode()
        logger.error(f"[MCP_TOOL] Error in recall_core_memories: {safe_error}")
        return f"Error retrieving memories: {safe_error}"

@mcp.tool()
async def recall_interests(query: str)  :
    """
    Search the user's memory specifically for their topics of interest and learning.
    
    Args:
        query: The semantic search query to look for in the user's interests.
    """
    where_filter = {
        "$and": [
            {"userId": DEFAULT_USER_ID},
            {"memoryType": "INTEREST"}
        ]
    }
    logger.info(f"[MCP_TOOL] recall_interests: query='{query}' filter={where_filter}")
    
    try:
        try:
            chroma_service.get_collection("memory_facts")
        except Exception:
            return f"No interests found for query: '{query}'"
            
        embedding = await embedding_service.generate_embedding(query)
        
        results = chroma_service.query(
            collection_name="memory_facts",
            query_embeddings=[embedding],
            n_results=5,
            where=where_filter
        )
        
        documents = results.get("documents", [[]])[0]
        if not documents:
            return f"No interests found for query: '{query}'"
            
        facts_text = "\n".join([f"- {doc}" for doc in documents])
        return f"Found the following interests:\n{facts_text}"
        
    except Exception as e:
        safe_error = str(e).encode('ascii', 'ignore').decode()
        logger.error(f"[MCP_TOOL] Error in recall_interests: {safe_error}")
        return f"Error retrieving interests: {safe_error}"

@mcp.tool()
async def list_known_topics()  :
    """
    List all known topics and facts about the user, grouped by memory type.
    """
    logger.info(f"[MCP_TOOL] list_known_topics")
    
    try:
        # Safely get collection
        try:
            collection = chroma_service.get_collection("memory_facts")
        except Exception:
            return "No memories have been stored yet."
            
        results = collection.get(where={"userId": DEFAULT_USER_ID})
        
        documents = results.get("documents", [])
        metadatas = results.get("metadatas", [])
        
        if not documents:
            return "No memories have been stored yet."
            
        grouped_facts = {}
        for doc, meta in zip(documents, metadatas):
            m_type = meta.get("memoryType", "UNKNOWN")
            if m_type not in grouped_facts:
                grouped_facts[m_type] = []
            grouped_facts[m_type].append(doc)
            
        output = []
        for m_type, facts in grouped_facts.items():
            output.append(f"### {m_type}")
            for f in facts[:5]: # limit to recent 5 per category
                output.append(f"- {f}")
            output.append("")
            
        return "\n".join(output)
        
    except Exception as e:
        safe_error = str(e).encode('ascii', 'ignore').decode()
        logger.error(f"[MCP_TOOL] Error in list_known_topics: {safe_error}")
        return f"Error retrieving topics: {safe_error}"
