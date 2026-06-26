from typing import Optional, List
import logging
from app.mcp.server import mcp
from app.services.chroma_service import chroma_service

logger = logging.getLogger(__name__)

@mcp.tool()
async def recall_chat_discussions(query: str, workspace_id: Optional[int] = None, source_type: Optional[str] = None):
    """
    Search the summarized discussion memories of previous chat sessions.
    Use this tool when the user asks questions like: "what did we discuss?", "what did you explain in the kafka pdf chat?", 
    "summarize our NDA pdf discussion", or refers to a past AI conversation.
    This does NOT search raw documents or memory profile facts.
    """
    try:
        where_filter = {}
        if workspace_id is not None:
            where_filter["workspace_id"] = workspace_id
            
        if source_type is not None:
            where_filter["source_type"] = source_type
            
        # If no filter keys, set where to None for chroma
        where = where_filter if where_filter else None

        # Use explicitly generated embeddings
        from app.services.embedding_service import embedding_service
        embedding = await embedding_service.generate_embedding(query)

        results = chroma_service.query(
            collection_name="chat_discussions",
            query_embeddings=[embedding],
            n_results=3,
            where=where
        )

        if not results or not results["documents"] or len(results["documents"][0]) == 0:
            return "No previous chat discussions found matching your query."

        # Format the results
        formatted_results = "Found the following past discussions:\n\n"
        for i, (doc, meta) in enumerate(zip(results["documents"][0], results["metadatas"][0])):
            topic = meta.get("topic", "Unknown Topic")
            src_type = meta.get("source_type", "chat")
            formatted_results += f"- **{topic}** ({src_type}):\n{doc}\n\n"

        return formatted_results.strip()

    except Exception as e:
        logger.error(f"Error in recall_chat_discussions: {e}")
        return f"Error recalling chat discussions: {str(e)}"
