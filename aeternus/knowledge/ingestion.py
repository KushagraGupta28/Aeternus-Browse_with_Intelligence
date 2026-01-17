
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, List, Optional

from aeternus.browser.session import BrowserSession
from aeternus.dom.markdown_extractor import extract_clean_markdown

logger = logging.getLogger(__name__)

@dataclass
class IngestedContent:
    url: str
    title: str
    content: str
    timestamp: datetime
    metadata: dict[str, Any]
    chunks: List[str] = None

class ContentIngestor:
    """
    Handles context-aware content ingestion from browser sessions.
    
    This class wraps the markdown extraction logic and provides semantic chunking
    capabilities (initially placeholder) to prepare content for the knowledge layer.
    """
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
    async def ingest_page(self, browser_session: BrowserSession) -> Optional[IngestedContent]:
        """
        Ingest the current page from the browser session.
        
        Args:
            browser_session: The active browser session
            
        Returns:
            IngestedContent object or None if ingestion fails
        """
        try:
            url = await browser_session.get_current_page_url()
            if not url or url == 'about:blank':
                logger.warning("Skipping ingestion: Invalid or empty URL")
                return None
                
            # Get page title (requires direct CDP or script evaluation, fallback to generic)
            # We can try to get it from the browser session's target info if available, 
            # or execute a quick script.
            # detailed title is usually available in session targets.
            title = "Unknown Page"
            if browser_session.agent_focus_target_id:
                target = browser_session.session_manager.get_target(browser_session.agent_focus_target_id)
                if target:
                    title = target.title
            
            # Extract markdown
            content, stats = await extract_clean_markdown(browser_session=browser_session)
            
            # Perform chunking
            chunks = self._chunk_content(content)
            
            ingested = IngestedContent(
                url=url,
                title=title,
                content=content,
                timestamp=datetime.now(),
                metadata=stats,
                chunks=chunks
            )
            
            logger.info(f"Ingested page '{title}' ({url}) - {len(content)} chars, {len(chunks)} chunks")
            return ingested
            
        except Exception as e:
            logger.error(f"Failed to ingest page: {e}", exc_info=True)
            return None
            
    def _chunk_content(self, content: str) -> List[str]:
        """
        Split content into overlapping chunks.
        
        This is a simple character-based splitter. 
        TODO: Implement semantic splitting using SentenceSplitter or LLM.
        """
        if not content:
            return []
            
        chunks = []
        start = 0
        content_len = len(content)
        
        while start < content_len:
            end = start + self.chunk_size
            chunk = content[start:end]
            chunks.append(chunk)
            start += self.chunk_size - self.chunk_overlap
            
        return chunks
