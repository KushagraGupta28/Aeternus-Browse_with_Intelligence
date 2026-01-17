
from abc import ABC, abstractmethod
from typing import List

class EmbeddingsProvider(ABC):
    """
    Abstract base class for embeddings providers.
    """
    
    @abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        """Embed a single query string."""
        pass
        
    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of document strings."""
        pass

class MockEmbeddings(EmbeddingsProvider):
    """
    Mock embeddings provider for testing/development without model dependencies.
    """
    
    def __init__(self, dimension: int = 768):
        self.dimension = dimension
        
    async def embed_query(self, text: str) -> List[float]:
        # Return a deterministic random vector based on length
        return [0.1] * self.dimension
        
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [[0.1] * self.dimension for _ in texts]
