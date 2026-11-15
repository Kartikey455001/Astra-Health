"""
ASTRA HEALTH — AI Service Data Models
Schemas for health explanations, RAG queries, and research citations.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ResearchItem(BaseModel):
    accession: str
    title: str
    description: str
    source: str
    category: str
    citation: str
    url: Optional[str] = None
    relevance_score: Optional[float] = 1.0


class ExplainRequest(BaseModel):
    astronaut_id: Optional[str] = "ast-1"
    kind: Optional[str] = "hr"
    facts: Optional[str] = ""
    query: Optional[str] = "Why is my heart rate increasing?"
    user_api_key: Optional[str] = None


class ExplainResponse(BaseModel):
    success: bool = True
    explanation: str
    citations: List[ResearchItem] = []
    source: str = "ASTRA RAG Knowledge Base + Space Medicine Reasoning"
    grounded_facts: str
    safety_rule: str = "ASTRA does not diagnose an astronaut or invent a medical cause. All alerts are workflow categories."


class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    category: Optional[str] = None


class QueryResponse(BaseModel):
    success: bool = True
    query: str
    total_found: int
    results: List[ResearchItem]
    synthesis: Optional[str] = None


class HealthCheckResponse(BaseModel):
    status: str = "ok"
    service: str = "ASTRA AI Service (FastAPI)"
    version: str = "2.0.0"
    datasets_loaded: int
    knowledge_base_size: int
    safety_mode: str = "Strict Non-Diagnostic Grounded AI"

