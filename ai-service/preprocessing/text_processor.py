"""
ASTRA HEALTH — Text Processor & Vectorizer
Tokenizes, scores, and extracts keywords for RAG search.
"""

import re
import math
from typing import List, Dict, Set


def tokenize(text: str) -> List[str]:
    """Clean and tokenize text into lowercase word stems/tokens."""
    clean = re.sub(r"[^\w\s-]", " ", text.lower())
    tokens = [w for w in clean.split() if len(w) > 2]
    return tokens


def term_frequency(tokens: List[str]) -> Dict[str, float]:
    """Calculate term frequencies for a list of tokens."""
    freq = {}
    total = len(tokens) or 1
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    return {k: v / total for k, v in freq.items()}


def compute_bm25_score(
    query_tokens: List[str],
    doc_tokens: List[str],
    avg_doc_len: float,
    idf_map: Dict[str, float],
    k1: float = 1.5,
    b: float = 0.75
) -> float:
    """Compute BM25 score for a document given query tokens."""
    score = 0.0
    doc_len = len(doc_tokens)
    tf_counts = {}
    for t in doc_tokens:
        tf_counts[t] = tf_counts.get(t, 0) + 1

    for q in query_tokens:
        if q not in tf_counts:
            continue
        tf = tf_counts[q]
        idf = idf_map.get(q, 1.0)
        numerator = tf * (k1 + 1)
        denominator = tf + k1 * (1 - b + b * (doc_len / (avg_doc_len or 1)))
        score += idf * (numerator / denominator)

    return score

