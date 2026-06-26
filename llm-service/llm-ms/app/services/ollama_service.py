"""
Ollama Service - Handles communication with Ollama API
This is the bridge between FastAPI and Ollama (running in Docker)
"""

import aiohttp
import os
import json
from typing import List, Dict
from dotenv import load_dotenv
from app.mcp.server import mcp

# Load environment variables
load_dotenv()

# Get configuration from .env
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("MODEL_NAME", "llama3.2:latest")

class OllamaService:
    """Service to interact with Ollama API"""
    
    @staticmethod
    async def check_health() -> bool:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{OLLAMA_BASE_URL}/api/tags",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    return response.status == 200
        except Exception as e:
            print(f"❌ Ollama health check failed: {e}")
            return False
            
    @staticmethod
    async def _get_mcp_tools_schema() -> List[Dict]:
        tools_schema = []
        # Await the list of tools
        from app.mcp.memory_tools import recall_core_memories, recall_interests, list_known_topics
        tools = await mcp.list_tools()
        for tool in tools:
            schema = tool.inputSchema if hasattr(tool, 'inputSchema') else {}
            # Convert JSON schema to Ollama function format
            tools_schema.append({
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": {
                        "type": "object",
                        "properties": schema.get("properties", {}),
                        "required": schema.get("required", [])
                    }
                }
            })
        return tools_schema

    @staticmethod
    async def generate(
        prompt: str, 
        temperature: float = 0.7, 
        max_tokens: int = 512, 
        model: str = None
    ) -> Dict:
        """Fallback to generate for simple non-agentic prompts"""
        model_name = model or MODEL_NAME
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": model_name,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens,
                            "top_p": 0.9,
                        }
                    },
                    timeout=aiohttp.ClientTimeout(total=180)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "response": data.get("response", ""),
                            "model": data.get("model", model_name),
                            "tokens_used": data.get("eval_count", 0)
                        }
                    else:
                        error_text = await response.text()
                        raise Exception(f"Ollama API error ({response.status}): {error_text}")
        except aiohttp.ClientError as e:
            raise Exception(f"Failed to connect to Ollama: {str(e)}")

    @staticmethod
    async def chat(
        messages: List[Dict], 
        temperature: float = 0.7, 
        max_tokens: int = 512, 
        model: str = None,
        use_tools: bool = False
    ) -> Dict:
        """
        Agentic Chat with Ollama using /api/chat and tool calling
        """
        model_name = model or MODEL_NAME
        
        # Phase 2: Tool Schema Exposure
        tools = []
        if use_tools:
            tools = await OllamaService._get_mcp_tools_schema()
            print(f"[MCP_TOOLS_EXPOSED] Loaded {len(tools)} tools from FastMCP registry")
        
        MAX_ITERATIONS = 3
        current_iteration = 0
        current_messages = list(messages)
        
        try:
            async with aiohttp.ClientSession() as session:
                while current_iteration < MAX_ITERATIONS:
                    current_iteration += 1
                    
                    payload = {
                        "model": model_name,
                        "messages": current_messages,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens,
                            "top_p": 0.9,
                        }
                    }
                    if use_tools:
                        payload["tools"] = tools
                        
                    print(f"\n==================== PHASE 2 ====================")
                    print(f"TOOLS_LOADED: {len(tools)}")
                    print(f"TOOL_NAMES: {[t['function']['name'] for t in tools] if tools else []}")
                    print(f"TOOLS_IN_PAYLOAD: {'YES' if 'tools' in payload else 'NO'}")
                    print(f"OLLAMA_PAYLOAD_JSON: {json.dumps(payload)}")
                    
                    async with session.post(
                        f"{OLLAMA_BASE_URL}/api/chat",
                        json=payload,
                        timeout=aiohttp.ClientTimeout(total=180)
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            raise Exception(f"Ollama Chat error ({response.status}): {error_text}")
                            
                        data = await response.json()
                        message = data.get("message", {})
                        
                        print(f"\n==================== PHASE 3 ====================")
                        print(f"RAW_OLLAMA_RESPONSE: {json.dumps(data)}")
                        print(f"MESSAGE_CONTENT: {message.get('content')}")
                        print(f"MESSAGE_TOOL_CALLS: {message.get('tool_calls', [])}")
                        
                        print(f"\n==================== PHASE 4 ====================")
                        tool_calls = message.get("tool_calls", [])
                        tool_call_detected = "YES" if tool_calls else "NO"
                        mcp_loop_entered = "YES" if tool_calls and use_tools else "NO"
                        direct_content_returned = "YES" if not tool_calls or not use_tools else "NO"
                        print(f"TOOL_CALL_DETECTED: {tool_call_detected}")
                        print(f"MCP_LOOP_ENTERED: {mcp_loop_entered}")
                        print(f"DIRECT_CONTENT_RETURNED: {direct_content_returned}")
                        if not tool_calls:
                            print(f"REASON: message.tool_calls was empty or missing.")
                        else:
                            print(f"REASON: Entering tool loop.")
                        print(f"=================================================\n")
                        
                        # Check for fake JSON tool leak
                        content = message.get("content", "").strip()
                        is_fake_json = False
                        
                        if use_tools and not tool_calls and content:
                            try:
                                parsed = json.loads(content)
                                if isinstance(parsed, dict) and "name" in parsed and ("parameters" in parsed or "arguments" in parsed):
                                    tool_name = parsed.get("name")
                                    registered_tool_names = [t["function"]["name"] for t in tools]
                                    if tool_name not in registered_tool_names:
                                        is_fake_json = True
                            except json.JSONDecodeError:
                                pass
                                
                        if is_fake_json:
                            print(f"[RECOVERY_PASS] Detected fake JSON tool call leak. Retrying without tools...")
                            current_messages = list(messages) # Reset to pure pre-response state
                            current_messages.append({
                                "role": "system",
                                "content": "Answer directly in natural language. Do not output tool-call JSON, function schemas, parameter objects, or fake tool payloads. If no tool is needed, answer normally."
                            })
                            use_tools = False  # Disable tools for the recovery pass
                            continue  # Go to the next iteration

                        # ── REGISTERED-TOOL JSON FALLBACK ───────────────────────────────────────
                        # Ollama 3B sometimes puts the tool call in content instead of tool_calls.
                        # If content is valid JSON with a registered tool name, convert it into a
                        # real tool invocation so the user never sees raw JSON.
                        if use_tools and not tool_calls and content:
                            try:
                                parsed_content = json.loads(content)
                                if isinstance(parsed_content, dict) and "name" in parsed_content:
                                    leaked_name = parsed_content.get("name")
                                    leaked_args = parsed_content.get("parameters") or parsed_content.get("arguments") or {}
                                    registered_tool_names = [t["function"]["name"] for t in tools]
                                    if leaked_name in registered_tool_names and isinstance(leaked_args, dict):
                                        # Synthesize a tool_calls list exactly like a normal Ollama tool_call
                                        print(f"[REGISTERED_TOOL_FALLBACK] Detected registered tool '{leaked_name}' in content. Converting to real tool invocation.")
                                        tool_calls = [{
                                            "function": {
                                                "name": leaked_name,
                                                "arguments": leaked_args,
                                            }
                                        }]
                                        # Replace message so it looks like a proper assistant tool-call message
                                        message = {"role": "assistant", "content": "", "tool_calls": tool_calls}
                            except json.JSONDecodeError:
                                pass
                        # ── END REGISTERED-TOOL JSON FALLBACK ────────────────────────────────────

                        # Append assistant message to history
                        current_messages.append(message)
                        
                        tool_calls = message.get("tool_calls", [])
                        
                        if not tool_calls or not use_tools:
                            # Finished generating
                            print(f"[MCP_FINAL_RESPONSE] Iteration {current_iteration} complete.")
                            return {
                                "response": message.get("content", ""),
                                "model": data.get("model", model_name),
                                "tokens_used": data.get("eval_count", 0)
                            }
                            
                        print(f"[MCP_TOOL_CALL] Received {len(tool_calls)} tool calls.")
                        
                        # Phase 3: Execute tool calls
                        for tc in tool_calls:
                            func = tc.get("function", {})
                            name = func.get("name")
                            args = func.get("arguments", {})
                            print(f"[MCP_TOOL_CALL] Invoking tool '{name}' with args {args}")
                            
                            try:
                                # Execute FastMCP tool
                                result_str = await mcp.call_tool(name, arguments=args)
                                # mcp.call_tool returns a list of elements. We extract text.
                                if isinstance(result_str, list):
                                    result_text = result_str[0].text if hasattr(result_str[0], 'text') else str(result_str)
                                else:
                                    result_text = str(result_str)
                                print(f"[MCP_TOOL_RESULT] '{name}' returned: {result_text[:100]}...")
                            except Exception as tool_err:
                                result_text = f"Error executing tool '{name}': {str(tool_err)}"
                                print(f"[MCP_TOOL_RESULT] {result_text}")
                                
                            # Append tool response
                            current_messages.append({
                                "role": "tool",
                                "name": name,
                                "content": result_text
                            })
                            
                        print(f"[MCP_SECOND_PASS] Sending tool results back for completion pass...")
                
                # Exceeded iterations
                return {
                    "response": "I apologize, but I encountered a loop while trying to access my tools. Please try rephrasing your request.",
                    "model": model_name,
                    "tokens_used": 0
                }
                
        except aiohttp.ClientError as e:
            raise Exception(f"Failed to connect to Ollama: {str(e)}")

# Create a singleton instance
ollama_service = OllamaService()
