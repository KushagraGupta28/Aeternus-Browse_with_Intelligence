import os
from typing import TYPE_CHECKING

from aeternus.logging_config import setup_logging

# Only set up logging if not in MCP mode or if explicitly requested
if os.environ.get('BROWSER_USE_SETUP_LOGGING', 'true').lower() != 'false':
	from aeternus.config import CONFIG

	# Get log file paths from config/environment
	debug_log_file = getattr(CONFIG, 'BROWSER_USE_DEBUG_LOG_FILE', None)
	info_log_file = getattr(CONFIG, 'BROWSER_USE_INFO_LOG_FILE', None)

	# Set up logging with file handlers if specified
	logger = setup_logging(debug_log_file=debug_log_file, info_log_file=info_log_file)
else:
	import logging

	logger = logging.getLogger('aeternus')

# Monkeypatch BaseSubprocessTransport.__del__ to handle closed event loops gracefully
from asyncio import base_subprocess

_original_del = base_subprocess.BaseSubprocessTransport.__del__


def _patched_del(self):
	"""Patched __del__ that handles closed event loops without throwing noisy red-herring errors like RuntimeError: Event loop is closed"""
	try:
		# Check if the event loop is closed before calling the original
		if hasattr(self, '_loop') and self._loop and self._loop.is_closed():
			# Event loop is closed, skip cleanup that requires the loop
			return
		_original_del(self)
	except RuntimeError as e:
		if 'Event loop is closed' in str(e):
			# Silently ignore this specific error
			pass
		else:
			raise


base_subprocess.BaseSubprocessTransport.__del__ = _patched_del


# Type stubs for lazy imports - fixes linter warnings
if TYPE_CHECKING:
	from aeternus.agent.prompts import SystemPrompt
	from aeternus.agent.service import Agent

	# from aeternus.agent.service import Agent
	from aeternus.agent.views import ActionModel, ActionResult, AgentHistoryList
	from aeternus.browser import BrowserProfile, BrowserSession
	from aeternus.browser import BrowserSession as Browser
	from aeternus.code_use.service import CodeAgent
	from aeternus.dom.service import DomService
	from aeternus.llm import models
	from aeternus.llm.anthropic.chat import ChatAnthropic
	from aeternus.llm.azure.chat import ChatAzureOpenAI
	from aeternus.llm.aeternus.chat import ChatBrowserUse
	from aeternus.llm.google.chat import ChatGoogle
	from aeternus.llm.groq.chat import ChatGroq
	from aeternus.llm.mistral.chat import ChatMistral
	from aeternus.llm.oci_raw.chat import ChatOCIRaw
	from aeternus.llm.ollama.chat import ChatOllama
	from aeternus.llm.openai.chat import ChatOpenAI
	from aeternus.llm.vercel.chat import ChatVercel
	from aeternus.sandbox import sandbox
	from aeternus.tools.service import Controller, Tools

	# Lazy imports mapping - only import when actually accessed
_LAZY_IMPORTS = {
	# Agent service (heavy due to dependencies)
	# 'Agent': ('aeternus.agent.service', 'Agent'),
	# Code-use agent (Jupyter notebook-like execution)
	'CodeAgent': ('aeternus.code_use.service', 'CodeAgent'),
	'Agent': ('aeternus.agent.service', 'Agent'),
	# System prompt (moderate weight due to agent.views imports)
	'SystemPrompt': ('aeternus.agent.prompts', 'SystemPrompt'),
	# Agent views (very heavy - over 1 second!)
	'ActionModel': ('aeternus.agent.views', 'ActionModel'),
	'ActionResult': ('aeternus.agent.views', 'ActionResult'),
	'AgentHistoryList': ('aeternus.agent.views', 'AgentHistoryList'),
	'BrowserSession': ('aeternus.browser', 'BrowserSession'),
	'Browser': ('aeternus.browser', 'BrowserSession'),  # Alias for BrowserSession
	'BrowserProfile': ('aeternus.browser', 'BrowserProfile'),
	# Tools (moderate weight)
	'Tools': ('aeternus.tools.service', 'Tools'),
	'Controller': ('aeternus.tools.service', 'Controller'),  # alias
	# DOM service (moderate weight)
	'DomService': ('aeternus.dom.service', 'DomService'),
	# Chat models (very heavy imports)
	'ChatOpenAI': ('aeternus.llm.openai.chat', 'ChatOpenAI'),
	'ChatGoogle': ('aeternus.llm.google.chat', 'ChatGoogle'),
	'ChatAnthropic': ('aeternus.llm.anthropic.chat', 'ChatAnthropic'),
	'ChatBrowserUse': ('aeternus.llm.aeternus.chat', 'ChatBrowserUse'),
	'ChatGroq': ('aeternus.llm.groq.chat', 'ChatGroq'),
	'ChatMistral': ('aeternus.llm.mistral.chat', 'ChatMistral'),
	'ChatAzureOpenAI': ('aeternus.llm.azure.chat', 'ChatAzureOpenAI'),
	'ChatOCIRaw': ('aeternus.llm.oci_raw.chat', 'ChatOCIRaw'),
	'ChatOllama': ('aeternus.llm.ollama.chat', 'ChatOllama'),
	'ChatVercel': ('aeternus.llm.vercel.chat', 'ChatVercel'),
	# LLM models module
	'models': ('aeternus.llm.models', None),
	# Sandbox execution
	'sandbox': ('aeternus.sandbox', 'sandbox'),
}


def __getattr__(name: str):
	"""Lazy import mechanism - only import modules when they're actually accessed."""
	if name in _LAZY_IMPORTS:
		module_path, attr_name = _LAZY_IMPORTS[name]
		try:
			from importlib import import_module

			module = import_module(module_path)
			if attr_name is None:
				# For modules like 'models', return the module itself
				attr = module
			else:
				attr = getattr(module, attr_name)
			# Cache the imported attribute in the module's globals
			globals()[name] = attr
			return attr
		except ImportError as e:
			raise ImportError(f'Failed to import {name} from {module_path}: {e}') from e

	raise AttributeError(f"module '{__name__}' has no attribute '{name}'")


__all__ = [
	'Agent',
	'CodeAgent',
	# 'CodeAgent',
	'BrowserSession',
	'Browser',  # Alias for BrowserSession
	'BrowserProfile',
	'Controller',
	'DomService',
	'SystemPrompt',
	'ActionResult',
	'ActionModel',
	'AgentHistoryList',
	# Chat models
	'ChatOpenAI',
	'ChatGoogle',
	'ChatAnthropic',
	'ChatBrowserUse',
	'ChatGroq',
	'ChatMistral',
	'ChatAzureOpenAI',
	'ChatOCIRaw',
	'ChatOllama',
	'ChatVercel',
	'Tools',
	'Controller',
	# LLM models module
	'models',
	# Sandbox execution
	'sandbox',
]
