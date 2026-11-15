"""
ASTRA HEALTH — AI Microservice
FastAPI + RAG Knowledge Base + NASA Research Citations
"""

import os
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import (
    ExplainRequest,
    ExplainResponse,
    QueryRequest,
    QueryResponse,
    HealthCheckResponse,
    ResearchItem
)
from rag.knowledge_retriever import retriever

app = FastAPI(
    title="ASTRA HEALTH AI Service",
    description="Offline-capable RAG & Decision-Support Assistant grounded in NASA OSDR, DONKI, RAD, LSDA, and NTRS datasets.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthCheckResponse)
def health_check():
    return HealthCheckResponse(
        status="ok",
        service="ASTRA AI Service (FastAPI)",
        version="2.0.0",
        datasets_loaded=len(retriever.documents),
        knowledge_base_size=len(retriever.documents),
        safety_mode="Strict Non-Diagnostic Grounded AI"
    )


@app.post("/api/ai/explain", response_model=ExplainResponse)
def explain_health_event(req: ExplainRequest):
    """
    Answers astronaut health questions and explains detected changes
    grounded in telemetry facts and NASA research citations.
    Follows prompt criteria:
    1. Recent heart-rate readings
    2. Personal baseline
    3. Exercise history
    4. Sleep and fatigue information
    5. Relevant symptoms
    6. Verified medical knowledge
    Never diagnoses or invents medical causes.
    """
    try:
        facts = req.facts or ""
        query = req.query or "Why is my heart rate increasing?"
        kind = req.kind or "hr"

        result = retriever.explain_health_event(facts=facts, query=query, kind=kind)

        return ExplainResponse(
            success=True,
            explanation=result["explanation"],
            citations=result["citations"],
            source="ASTRA RAG Knowledge Base + NASA Space Biology Citations",
            grounded_facts=facts
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation generation failed: {str(e)}")


@app.post("/api/ai/query", response_model=QueryResponse)
def query_knowledge_base(req: QueryRequest):
    """
    Semantic search over the NASA research knowledge base (OSDR, DONKI, RAD, LSDA, NTRS).
    """
    try:
        results = retriever.search(query=req.query, top_k=req.top_k or 5, category=req.category)
        return QueryResponse(
            success=True,
            query=req.query,
            total_found=len(results),
            results=results,
            synthesis=f"Found {len(results)} NASA scientific research items matching '{req.query}'."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ai/research", response_model=List[ResearchItem])
def list_research(
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Category filter (Bone loss, Muscle loss, Cardiovascular, Radiation, etc.)"),
    limit: int = Query(10, ge=1, le=50)
):
    if q:
        return retriever.search(query=q, top_k=limit, category=category)
    filtered = retriever.documents
    if category:
        filtered = [d for d in filtered if d.get("category", "").lower() == category.lower()]
    return [ResearchItem(**d) for d in filtered[:limit]]


@app.get("/api/ai/datasets")
def list_datasets_overview():
    return {
        "sources": [
            {
                "name": "NASA OSDR",
                "title": "Open Science Data Repository",
                "records_indexed": len([d for d in retriever.documents if d.get("source") == "NASA OSDR"]),
                "url": "https://osdr.nasa.gov/"
            },
            {
                "name": "NASA DONKI",
                "title": "Space Weather Database Of Notifications, Knowledge, Information",
                "records_indexed": len([d for d in retriever.documents if d.get("source") == "NASA DONKI"]),
                "url": "https://ccmc.gsfc.nasa.gov/DONKI/"
            },
            {
                "name": "Curiosity RAD",
                "title": "Radiation Assessment Detector (MSL PDS Archive)",
                "records_indexed": len([d for d in retriever.documents if d.get("source") == "Curiosity RAD"]),
                "url": "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/"
            },
            {
                "name": "NASA LSDA",
                "title": "Life Sciences Data Archive",
                "records_indexed": len([d for d in retriever.documents if d.get("source") == "NASA LSDA"]),
                "url": "https://nlsp.nasa.gov/explore/lsdahome"
            },
            {
                "name": "NASA NTRS",
                "title": "NASA Technical Reports Server",
                "records_indexed": len([d for d in retriever.documents if d.get("source") == "NASA NTRS"]),
                "url": "https://ntrs.nasa.gov/"
            }
        ],
        "total_documents": len(retriever.documents)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

