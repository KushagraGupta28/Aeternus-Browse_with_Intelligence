
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

from aeternus.llm.base import BaseChatModel
from aeternus.llm.messages import UserMessage, SystemMessage

class IntentType(str, Enum):
    RESEARCH = "research"
    EXECUTION = "execution" 
    PLANNING = "planning"
    NAVIGATION = "navigation"
    GENERAL = "general"

class IntentAnalysis(BaseModel):
    intent: IntentType
    confidence: float
    reasoning: str
    suggested_steps: Optional[list[str]] = Field(default_factory=list)

class IntentClassifier:
    """
    Classifies user tasks into specific intents to guide agent behavior.
    """
    
    def __init__(self, llm: BaseChatModel):
        self.llm = llm
        
    async def classify(self, task: str) -> IntentAnalysis:
        """
        Classify the user task.
        """
        system_prompt = """You are an expert intent classifier for a browser agent.
        Analyze the user's task and classify it into one of the following categories:
        - research: The user wants to find information, compare products, or learn about a topic.
        - execution: The user wants to perform a specific action like booking a flight, filling a form, or clicking a button.
        - planning: The user asks for a plan or a strategy.
        - navigation: The user explicitly asks to go to a URL.
        - general: Any other request.
        
        Provide your analysis in JSON format matching the schema:
        {
            "intent": "research" | "execution" | "planning" | "navigation" | "general",
            "confidence": float (0.0 to 1.0),
            "reasoning": "string explanation",
            "suggested_steps": ["step 1", "step 2"]
        }
        """
        
        try:
            messages = [
                SystemMessage(content=system_prompt),
                UserMessage(content=f"Task: {task}")
            ]
            
            # Use structured output if available, otherwise parse JSON
            # For simplicity assuming the LLM can return JSON or we might need a wrapper
            # checking if llm supports structured output would be better but for now let's try direct prompt
            # Actually, using tools.registry views pattern might be cleaner but let's stick to simple generation first
            
            response = await self.llm.astep(messages)
            content = response.content
            
            # Simple JSON extraction if needed
            import json
            import re
            
            # Try to find JSON block
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                json_str = match.group(0)
                data = json.loads(json_str)
                return IntentAnalysis(**data)
            else:
                # Fallback
                return IntentAnalysis(
                    intent=IntentType.GENERAL, 
                    confidence=0.5, 
                    reasoning="Could not parse intent from LLM response"
                )
                
        except Exception as e:
            # Fallback on error
            return IntentAnalysis(
                intent=IntentType.GENERAL, 
                confidence=0.0, 
                reasoning=f"Error during classification: {e}"
            )
