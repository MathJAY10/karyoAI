from mcp.server.fastmcp import FastMCP
import logging

logger = logging.getLogger(__name__)

# Create FastMCP instance
mcp = FastMCP("KaryoAI Memory")

# Import tools so they register with the server
import app.mcp.memory_tools
import app.mcp.discussion_tools
