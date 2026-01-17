"""Entry point for running MCP server as a module.

Usage:
    python -m aeternus.mcp
"""

import asyncio

from aeternus.mcp.server import main

if __name__ == '__main__':
	asyncio.run(main())
