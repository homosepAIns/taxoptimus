"""Chatbot module for handling AI tax assistant logic with tool-calling capabilities."""

import os
import json
import re
from groq import Groq
from duckduckgo_search import DDGS
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
    "You are a helpful Irish tax assistant. You answer questions strictly based on Irish tax laws. "
    "MANDATORY: You MUST provide the exact source URLs from your search results in your response."
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
        response = self.client.chat.completions.create(
            model=MODEL,
            messages=groq_messages,
            tools=TOOLS,
            tool_choice="auto",
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

        for tool_call in response_msg.tool_calls:
            if tool_call.function.name == TOOL_NAME:
                try:
                    args = json.loads(tool_call.function.arguments)
                    result = search_revenue_ie(args.get("query"))
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
            {"role": "system", "content": "The user wants a summary of the search results found above. Provide a clear answer and cite the SOURCE_URL links provided in the results."}
        ]
        
        final_response = self.client.chat.completions.create(
            model=MODEL,
            messages=final_answer_messages,
            temperature=0,
        )
        
        return final_response.choices[0].message.content or "I found the info but couldn't write a summary. Please try again."

assistant = TaxAssistant()
