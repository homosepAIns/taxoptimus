"""Chatbot module for handling AI tax assistant logic with tool-calling capabilities."""

import os
import json
import re
from groq import Groq
from ddgs import DDGS
from .schemas import ChatMessage

# MODEL VERSION: 1.0.6 (Standardizing on Llama 3.3 70b with minimal prompting)
MODEL = "llama-3.3-70b-versatile"

def search_revenue_ie(query: str) -> str:
    """Searches revenue.ie for information."""
    print(f"\n[Bot is searching Revenue.ie for: '{query}']")
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(f"site:revenue.ie {query}", max_results=3))
            
        if not results:
            return "No results found on revenue.ie for this query."
        
        info = "REVENUE.IE SEARCH RESULTS:\n\n"
        for res in results:
            info += f"SOURCE_TITLE: {res.get('title')}\n"
            info += f"SOURCE_SUMMARY: {res.get('body')}\n"
            info += f"SOURCE_URL: {res.get('href')}\n\n"
        return info
    except Exception as e:
        return f"Error performing search: {e}"

# Simple tool name to prevent tag-based hallucination
TOOL_NAME = "search_tool"

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": TOOL_NAME,
            "description": "Searches the official Irish Revenue website (revenue.ie) for tax info.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"}
                },
                "required": ["query"],
            },
        },
    }
]

# MINIMALIST SYSTEM PROMPT: Zero mention of tools.
# This forces the model to use the official 'tools' parameter instead of writing XML tags.
SYSTEM_PROMPT = (
    "You are a helpful Irish tax assistant. You operate under a STRICT ZERO-HALLUCINATION POLICY.\n"
    "MANDATORY REQUIREMENTS: \n"
    "1. Base your answer EXCLUSIVELY on the provided REVENUE.IE SEARCH RESULTS. Do NOT use your pre-trained knowledge.\n"
    "2. If the user asks for a future year (e.g., 2026) and it is not in the search results, you MUST state that you cannot find that specific year, BUT you should then provide the most recent tax rates you DID find in the search results.\n"
    "3. You MUST provide the exact SOURCE_URL links from your search results to prove your claims."
)

class TaxAssistant:
    def __init__(self):
        self.client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

    def chat(self, messages: list[ChatMessage]) -> str:
        """
        Handles a single chat turn, resolving tool calls if necessary.
        Version 1.0.6: Fixed '400 tool_use_failed' via minimalist prompting.
        """
        print(f"\n[DEBUG] Running Chatbot Version 1.0.6 with model {MODEL}")
        
        groq_messages = []
        groq_messages.append({"role": "system", "content": SYSTEM_PROMPT})
            
        for m in messages:
            if m.role == "system": continue
            
            # 1. HISTORY CLEANING
            # Strip any previous hand-written tags that might confuse the model
            content = m.content
            if content:
                content = re.sub(r'<function=.*?>', '', content)
                content = re.sub(r'</function>', '', content)
                content = content.replace('search_revenue_ie', TOOL_NAME).replace('search_revenue', TOOL_NAME).replace('search', TOOL_NAME)

            msg_dict = {"role": m.role, "content": content if content else None}
            
            # 2. TOOL CALLS TO DICTS
            if m.tool_calls:
                msg_dict["tool_calls"] = []
                for tc in m.tool_calls:
                    tc_dict = tc if isinstance(tc, dict) else tc.model_dump()
                    if "function" in tc_dict:
                        tc_dict["function"]["name"] = TOOL_NAME
                    msg_dict["tool_calls"].append(tc_dict)
                msg_dict["content"] = None
            
            # 3. TOOL RESULTS
            if m.role == "tool":
                msg_dict["name"] = TOOL_NAME
                if m.tool_call_id:
                    msg_dict["tool_call_id"] = m.tool_call_id

            groq_messages.append(msg_dict)

        if not self.client.api_key:
            raise ValueError("GROQ_API_KEY not found in environment.")

        # TURN 1: Initial Generation
        # FORCE the model to use the search tool. This stops it from skipping the search
        # and relying on its pre-trained memory.
        response = self.client.chat.completions.create(
            model=MODEL,
            messages=groq_messages,
            tools=TOOLS,
            tool_choice={"type": "function", "function": {"name": TOOL_NAME}},
            temperature=0,
        )
        
        response_msg = response.choices[0].message
        
        if not response_msg.tool_calls:
            return response_msg.content or "I couldn't generate a response."

        # TURN 2: Tool Execution
        assistant_dict = {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": tc.type,
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                } for tc in response_msg.tool_calls
            ]
        }
        groq_messages.append(assistant_dict)

        # Generate user-friendly markdown links directly from DDG
        user_markdown_links = "\n\n**Sources:**\n"
        
        for tool_call in response_msg.tool_calls:
            if tool_call.function.name == TOOL_NAME:
                try:
                    args = json.loads(tool_call.function.arguments)
                    query = args.get("query")
                    print(f"\n[Bot is searching Revenue.ie for: '{query}']")
                    
                    with DDGS() as ddgs:
                        ddg_results = list(ddgs.text(f"site:revenue.ie {query}", max_results=3))
                        
                    if not ddg_results:
                        result = "No results found."
                    else:
                        result = "REVENUE.IE SEARCH RESULTS:\n\n"
                        for res in ddg_results:
                            result += f"SOURCE_TITLE: {res.get('title')}\n"
                            result += f"SOURCE_SUMMARY: {res.get('body')}\n"
                            result += f"SOURCE_URL: {res.get('href')}\n\n"
                            
                            # Append clean markdown link for the user
                            title = res.get('title', 'Revenue.ie Document')
                            # Clean up title if it's too long or has boilerplate
                            title = title.split(' - ')[0] if ' - ' in title else title
                            href = res.get('href', '#')
                            user_markdown_links += f"- [{title}]({href})\n"
                            
                except Exception as e:
                    result = f"Error: {e}"
                
                groq_messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": TOOL_NAME,
                    "content": result,
                })

        # TURN 3: Final Answer
        # We REMOVE tools here to force the model to summarize instead of searching again
        final_answer_messages = groq_messages + [
            {"role": "system", "content": "FINAL WARNING: You operate under a ZERO-HALLUCINATION policy. Answer STRICTLY with the facts provided in the search results directly above. DO NOT use pre-trained knowledge. IF the specific year requested (e.g. 2026) is absent, state that and provide the most recent rates you DID find from the results."}
        ]
        
        final_response = self.client.chat.completions.create(
            model=MODEL,
            messages=final_answer_messages,
            temperature=0,
        )
        
        final_text = final_response.choices[0].message.content or "I found the info but couldn't write a summary. Please try again."
        
        # Only append sources if we actually searched something
        if "- [" in user_markdown_links:
             final_text += user_markdown_links
             
        return final_text

assistant = TaxAssistant()
