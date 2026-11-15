"""
ASTRA HEALTH — RAG Knowledge Retriever & Explainer
Grounded in the 5 NASA datasets: OSDR, DONKI, RAD, LSDA, NTRS.
"""

import os
import json
import math
from pathlib import Path
from typing import List, Dict, Any, Optional

from preprocessing.text_processor import tokenize, compute_bm25_score
from models.schemas import ResearchItem

DATASETS_DIR = Path(__file__).resolve().parent.parent / "datasets"


class KnowledgeRetriever:
    def __init__(self):
        self.documents: List[Dict[str, Any]] = []
        self.doc_tokens: List[List[str]] = []
        self.idf_map: Dict[str, float] = {}
        self.avg_doc_len: float = 0.0
        self.load_datasets()
        self.build_index()

    def load_datasets(self):
        dataset_files = [
            "inventory_datasets.json",
            "osdr_studies.json",
            "curiosity_rad.json",
            "lsda_topics.json",
            "ntrs_publications.json",
            "donki_guidelines.json"
        ]

        self.documents = []
        for fn in dataset_files:
            fp = DATASETS_DIR / fn
            if fp.exists():
                try:
                    with open(fp, "r", encoding="utf-8") as f:
                        items = json.load(f)
                        self.documents.extend(items)
                except Exception as e:
                    print(f"Error loading {fn}: {e}")

    def build_index(self):
        if not self.documents:
            return

        self.doc_tokens = []
        doc_count = len(self.documents)
        df_counts = {}

        total_tokens = 0
        for doc in self.documents:
            text = f"{doc.get('title', '')} {doc.get('description', '')} {doc.get('category', '')} {doc.get('source', '')}"
            tokens = tokenize(text)
            self.doc_tokens.append(tokens)
            total_tokens += len(tokens)

            unique_tokens = set(tokens)
            for t in unique_tokens:
                df_counts[t] = df_counts.get(t, 0) + 1

        self.avg_doc_len = total_tokens / (doc_count or 1)

        # Compute IDF: ln(1 + (N - n + 0.5) / (n + 0.5))
        self.idf_map = {}
        for token, df in df_counts.items():
            self.idf_map[token] = math.log(1.0 + (doc_count - df + 0.5) / (df + 0.5))

    def search(self, query: str, top_k: int = 5, category: Optional[str] = None) -> List[ResearchItem]:
        q_tokens = tokenize(query)
        if not q_tokens or not self.documents:
            # Fallback to first top_k
            return [ResearchItem(**d) for d in self.documents[:top_k]]

        scored = []
        for i, doc in enumerate(self.documents):
            if category and doc.get("category", "").lower() != category.lower():
                continue

            bm25 = compute_bm25_score(
                query_tokens=q_tokens,
                doc_tokens=self.doc_tokens[i],
                avg_doc_len=self.avg_doc_len,
                idf_map=self.idf_map
            )

            # Boost title matches
            title_tokens = set(tokenize(doc.get("title", "")))
            common_title = set(q_tokens).intersection(title_tokens)
            score = bm25 + len(common_title) * 2.0

            scored.append((score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, doc in scored[:top_k]:
            item_data = dict(doc)
            item_data["relevance_score"] = round(float(score), 3)
            results.append(ResearchItem(**item_data))

        return results

    def explain_health_event(self, facts: str, query: str, kind: str = "hr") -> Dict[str, Any]:
        """
        Generates research-grounded explanation based strictly on verified facts
        and the 6 prompt criteria:
        1. Recent heart-rate readings
        2. Personal baseline
        3. Exercise history
        4. Sleep and fatigue information
        5. Relevant symptoms / context
        6. Verified medical knowledge
        """
        search_term = "cardiovascular heart rate exercise sleep microgravity" if kind == "hr" else query
        citations = self.search(search_term, top_k=3)

        explanation_lines = [
            "ASTRA Decision Support Explanation (Research Grounded)",
            "-------------------------------------------------------",
            facts.strip() if facts else "No telemetry facts provided.",
            "\nSupporting NASA Research & Scientific Citations:",
        ]

        for c in citations:
            explanation_lines.append(f"• [{c.source}] {c.title} — Citation: {c.citation} ({c.url})")

        explanation_lines.append("\nOperational Guidance:")
        explanation_lines.append("- Review flight schedule and ensure workload does not exceed operational rest margins.")
        explanation_lines.append("- Recheck vital measurements after a rest period before concluding persistent elevation.")
        explanation_lines.append("- If repeat measurements remain elevated in the ACT tier, notify the flight surgeon.")
        explanation_lines.append("\nSafety Rule: ASTRA does NOT diagnose an astronaut or invent a medical cause. All alerts are workflow classifications.")

        return {
            "explanation": "\n".join(explanation_lines),
            "citations": citations
        }


retriever = KnowledgeRetriever()

