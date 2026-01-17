"""
We have switched all of our code from langchain to openai.types.chat.chat_completion_message_param.

For easier transition we have
"""

from typing import TYPE_CHECKING

# Lightweight imports that are commonly used
from aeternus.llm.base import BaseChatModel
from aeternus.llm.messages import (
	AssistantMessage,
	BaseMessage,
	SystemMessage,
	UserMessage,
)
from aeternus.llm.messages import (
	ContentPartImageParam as ContentImage,
)
from aeternus.llm.messages import (
	ContentPartRefusalParam as ContentRefusal,
)
from aeternus.llm.messages import (
	ContentPartTextParam as ContentText,
)

# Type stubs for lazy imports
if TYPE_CHECKING:
	from aeternus.llm.anthropic.chat import ChatAnthropic
	from aeternus.llm.aws.chat_anthropic import ChatAnthropicBedrock
	from aeternus.llm.aws.chat_bedrock import ChatAWSBedrock
	from aeternus.llm.azure.chat import ChatAzureOpenAI
	from aeternus.llm.aeternus.chat import ChatBrowserUse
	from aeternus.llm.cerebras.chat import ChatCerebras
	from aeternus.llm.deepseek.chat import ChatDeepSeek
	from aeternus.llm.google.chat import ChatGoogle
	from aeternus.llm.groq.chat import ChatGroq
	from aeternus.llm.mistral.chat import ChatMistral
	from aeternus.llm.oci_raw.chat import ChatOCIRaw
	from aeternus.llm.ollama.chat import ChatOllama
	from aeternus.llm.openai.chat import ChatOpenAI
	from aeternus.llm.openrouter.chat import ChatOpenRouter
	from aeternus.llm.vercel.chat import ChatVercel

	# Type stubs for model instances - enables IDE autocomplete
	openai_gpt_4o: ChatOpenAI
	openai_gpt_4o_mini: ChatOpenAI
	openai_gpt_4_1_mini: ChatOpenAI
	openai_o1: ChatOpenAI
	openai_o1_mini: ChatOpenAI
	openai_o1_pro: ChatOpenAI
	openai_o3: ChatOpenAI
	openai_o3_mini: ChatOpenAI
	openai_o3_pro: ChatOpenAI
	openai_o4_mini: ChatOpenAI
	openai_gpt_5: ChatOpenAI
	openai_gpt_5_mini: ChatOpenAI
	openai_gpt_5_nano: ChatOpenAI

	azure_gpt_4o: ChatAzureOpenAI
	azure_gpt_4o_mini: ChatAzureOpenAI
	azure_gpt_4_1_mini: ChatAzureOpenAI
	azure_o1: ChatAzureOpenAI
	azure_o1_mini: ChatAzureOpenAI
	azure_o1_pro: ChatAzureOpenAI
	azure_o3: ChatAzureOpenAI
	azure_o3_mini: ChatAzureOpenAI
	azure_o3_pro: ChatAzureOpenAI
	azure_gpt_5: ChatAzureOpenAI
	azure_gpt_5_mini: ChatAzureOpenAI

	google_gemini_2_0_flash: ChatGoogle
	google_gemini_2_0_pro: ChatGoogle
	google_gemini_2_5_pro: ChatGoogle
	google_gemini_2_5_flash: ChatGoogle
	google_gemini_2_5_flash_lite: ChatGoogle

# Models are imported on-demand via __getattr__

# Lazy imports mapping for heavy chat models
_LAZY_IMPORTS = {
	'ChatAnthropic': ('aeternus.llm.anthropic.chat', 'ChatAnthropic'),
	'ChatAnthropicBedrock': ('aeternus.llm.aws.chat_anthropic', 'ChatAnthropicBedrock'),
	'ChatAWSBedrock': ('aeternus.llm.aws.chat_bedrock', 'ChatAWSBedrock'),
	'ChatAzureOpenAI': ('aeternus.llm.azure.chat', 'ChatAzureOpenAI'),
	'ChatBrowserUse': ('aeternus.llm.aeternus.chat', 'ChatBrowserUse'),
	'ChatCerebras': ('aeternus.llm.cerebras.chat', 'ChatCerebras'),
	'ChatDeepSeek': ('aeternus.llm.deepseek.chat', 'ChatDeepSeek'),
	'ChatGoogle': ('aeternus.llm.google.chat', 'ChatGoogle'),
	'ChatGroq': ('aeternus.llm.groq.chat', 'ChatGroq'),
	'ChatMistral': ('aeternus.llm.mistral.chat', 'ChatMistral'),
	'ChatOCIRaw': ('aeternus.llm.oci_raw.chat', 'ChatOCIRaw'),
	'ChatOllama': ('aeternus.llm.ollama.chat', 'ChatOllama'),
	'ChatOpenAI': ('aeternus.llm.openai.chat', 'ChatOpenAI'),
	'ChatOpenRouter': ('aeternus.llm.openrouter.chat', 'ChatOpenRouter'),
	'ChatVercel': ('aeternus.llm.vercel.chat', 'ChatVercel'),
}

# Cache for model instances - only created when accessed
_model_cache: dict[str, 'BaseChatModel'] = {}


def __getattr__(name: str):
	"""Lazy import mechanism for heavy chat model imports and model instances."""
	if name in _LAZY_IMPORTS:
		module_path, attr_name = _LAZY_IMPORTS[name]
		try:
			from importlib import import_module

			module = import_module(module_path)
			attr = getattr(module, attr_name)
			return attr
		except ImportError as e:
			raise ImportError(f'Failed to import {name} from {module_path}: {e}') from e

	# Check cache first for model instances
	if name in _model_cache:
		return _model_cache[name]

	# Try to get model instances from models module on-demand
	try:
		from aeternus.llm.models import __getattr__ as models_getattr

		attr = models_getattr(name)
		# Cache in our clean cache dict
		_model_cache[name] = attr
		return attr
	except (AttributeError, ImportError):
		pass

	raise AttributeError(f"module '{__name__}' has no attribute '{name}'")


__all__ = [
	# Message types -> for easier transition from langchain
	'BaseMessage',
	'UserMessage',
	'SystemMessage',
	'AssistantMessage',
	# Content parts with better names
	'ContentText',
	'ContentRefusal',
	'ContentImage',
	# Chat models
	'BaseChatModel',
	'ChatOpenAI',
	'ChatBrowserUse',
	'ChatDeepSeek',
	'ChatGoogle',
	'ChatAnthropic',
	'ChatAnthropicBedrock',
	'ChatAWSBedrock',
	'ChatGroq',
	'ChatMistral',
	'ChatAzureOpenAI',
	'ChatOCIRaw',
	'ChatOllama',
	'ChatOpenRouter',
	'ChatVercel',
	'ChatCerebras',
]
