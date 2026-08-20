"""Reproducibly score and cluster a small, cited public-review evidence sample.

Input: review_sample.csv (public excerpts collected manually from cited review pages).
Output: analysis_output.json and cluster_assignments.csv.

The script deliberately uses only the Python standard library. It combines a transparent,
domain-aware lexicon sentiment score with deterministic TF-IDF k-means clustering. Cluster
labels are assigned from top terms, then reviewed by an analyst before strategy use.
"""

from __future__ import annotations

import csv
import json
import math
import random
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "review_sample.csv"
OUTPUT = ROOT / "analysis_output.json"
ASSIGNMENTS = ROOT / "cluster_assignments.csv"
K = 6
SEED = 21

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "had",
    "has", "have", "in", "is", "it", "its", "of", "on", "or", "so", "that", "the",
    "their", "then", "this", "to", "too", "was", "were", "with", "without", "after",
    "before", "not", "no", "than", "rather", "when", "while", "one", "all", "can", "could",
    "would", "did", "do", "does", "into", "out", "up", "our", "they", "them", "you",
}

# Transparent, email-marketing-specific vocabulary; values are polarity weights.
LEXICON = {
    "easy": 1.0, "easier": 1.0, "intuitive": 1.2, "reliable": 1.3, "helpful": 1.1,
    "patient": 1.0, "swift": 1.1, "efficient": 1.0, "specific": 0.7, "strong": 0.8,
    "value": 0.8, "resolved": 1.0, "excellent": 1.2, "good": 0.7, "best": 1.1,
    "bug": -1.4, "bugs": -1.4, "buggy": -1.5, "stuck": -1.2, "suspended": -1.5,
    "banned": -1.6, "blocked": -1.3, "slow": -1.1, "expensive": -1.2, "overpriced": -1.5,
    "predatory": -1.8, "confusing": -1.0, "complicated": -0.9, "missing": -1.2,
    "failed": -1.3, "failure": -1.3, "hard": -0.7, "unavailable": -1.2, "incorrect": -1.0,
    "outdated": -1.0, "cancellation": -0.8, "refund": -0.7, "downgrade": -0.5,
    "unhelpful": -1.2, "generic": -0.8, "cannot": -0.8, "unable": -0.8,
}

PAIN_POINT_RULES = {
    "Pricing & billing control": {"price", "prices", "expensive", "overpriced", "billing", "charge", "charges", "refund", "downgrade", "payment", "tier", "plan"},
    "Support & human escalation": {"support", "chat", "human", "bots", "bot", "articles", "guidance", "help", "reply", "response", "generic", "ai"},
    "Account trust & compliance": {"suspended", "suspension", "banned", "blocked", "compliance", "validation", "verify", "verification", "denied", "appeal", "policy"},
    "Reliability & performance": {"bug", "bugs", "buggy", "slow", "stuck", "failed", "failure", "bounced", "bounce", "load", "soft", "disruption"},
    "Workflow flexibility": {"workflow", "workflows", "automation", "automations", "template", "templates", "segmentation", "campaign", "contacts", "editing", "edit", "move"},
    "Onboarding & usability": {"setup", "signup", "creation", "login", "navigate", "navigation", "intuitive", "easy", "confusing", "interface", "dashboard", "migration"},
}


def tokenize(text: str) -> list[str]:
    return [word for word in re.findall(r"[a-z]{2,}", text.lower()) if word not in STOPWORDS]


def sentiment_score(tokens: list[str], rating: int) -> float:
    lexical = sum(LEXICON.get(token, 0.0) for token in tokens)
    # Rating prevents the lexicon from mistaking a positive phrase inside a negative review as overall positive.
    rating_signal = (rating - 3) * 1.1
    return round(lexical + rating_signal, 3)


def sentiment_label(score: float) -> str:
    if score >= 1.25:
        return "positive"
    if score <= -1.25:
        return "negative"
    return "neutral"


def assign_pain_points(tokens: list[str]) -> list[str]:
    token_set = set(tokens)
    hits = [name for name, vocabulary in PAIN_POINT_RULES.items() if token_set & vocabulary]
    return hits or ["Other / contextual"]


def vectors(docs: list[list[str]]) -> tuple[list[dict[str, float]], list[str]]:
    all_terms = set().union(*map(set, docs))
    doc_frequency = Counter({term: sum(term in set(doc) for doc in docs) for term in all_terms})
    n_docs = len(docs)
    vectors_out: list[dict[str, float]] = []
    for document in docs:
        counts = Counter(document)
        size = len(document) or 1
        vector = {term: (count / size) * math.log((n_docs + 1) / (doc_frequency[term] + 1)) + 1 for term, count in counts.items()}
        norm = math.sqrt(sum(value * value for value in vector.values())) or 1
        vectors_out.append({term: value / norm for term, value in vector.items()})
    vocabulary = sorted(doc_frequency)
    return vectors_out, vocabulary


def cosine(a: dict[str, float], b: dict[str, float]) -> float:
    return sum(value * b.get(term, 0.0) for term, value in a.items())


def centroid(group: list[dict[str, float]]) -> dict[str, float]:
    if not group:
        return {}
    combined: defaultdict[str, float] = defaultdict(float)
    for vector in group:
        for term, value in vector.items():
            combined[term] += value
    size = len(group)
    values = {term: value / size for term, value in combined.items()}
    norm = math.sqrt(sum(value * value for value in values.values())) or 1
    return {term: value / norm for term, value in values.items()}


def kmeans(tfidf: list[dict[str, float]], k: int) -> list[int]:
    random.seed(SEED)
    centroids = [dict(v) for v in random.sample(tfidf, k)]
    assignments = [-1] * len(tfidf)
    for _ in range(60):
        updated = [max(range(k), key=lambda idx: cosine(vector, centroids[idx])) for vector in tfidf]
        if updated == assignments:
            break
        assignments = updated
        groups = [[vector for vector, cluster in zip(tfidf, assignments) if cluster == idx] for idx in range(k)]
        centroids = [centroid(group) if group else centroids[idx] for idx, group in enumerate(groups)]
    return assignments


def main() -> None:
    with INPUT.open(newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))

    for row in rows:
        row["rating"] = int(row["rating"])
        row["tokens"] = tokenize(row["excerpt"])
        row["sentiment_score"] = sentiment_score(row["tokens"], row["rating"])
        row["sentiment"] = sentiment_label(row["sentiment_score"])
        row["pain_points"] = assign_pain_points(row["tokens"])

    tfidf, _ = vectors([row["tokens"] for row in rows])
    clusters = kmeans(tfidf, K)
    for row, cluster in zip(rows, clusters):
        row["cluster"] = cluster + 1

    cluster_terms: dict[int, Counter[str]] = defaultdict(Counter)
    for row in rows:
        cluster_terms[row["cluster"]].update(row["tokens"])
    cluster_summary = {
        str(cluster): {"size": sum(row["cluster"] == cluster for row in rows), "top_terms": [term for term, _ in terms.most_common(8)]}
        for cluster, terms in sorted(cluster_terms.items())
    }

    competitors: dict[str, dict] = {}
    for competitor in sorted({row["competitor"] for row in rows}):
        subset = [row for row in rows if row["competitor"] == competitor]
        pain_counts = Counter(point for row in subset for point in row["pain_points"])
        competitors[competitor] = {
            "reviews": len(subset),
            "mean_rating": round(sum(row["rating"] for row in subset) / len(subset), 2),
            "mean_sentiment": round(sum(row["sentiment_score"] for row in subset) / len(subset), 2),
            "negative_reviews": sum(row["sentiment"] == "negative" for row in subset),
            "pain_points": dict(pain_counts.most_common()),
        }

    aggregate_pain_points = Counter(point for row in rows for point in row["pain_points"])
    output = {
        "method": {
            "sample": "Purposive public-review evidence sample, manually captured from five cited Trustpilot company pages on 2026-08-20.",
            "limitations": "Not a census or statistically representative sample. Excerpts are shortened quotations; output should guide discovery, not determine market share or causal claims.",
            "sentiment": "Transparent domain-aware lexicon plus 1–5 review-rating signal.",
            "clustering": "Deterministic TF-IDF k-means (k=6); clusters require analyst interpretation.",
        },
        "sample_size": len(rows),
        "sentiment_distribution": dict(Counter(row["sentiment"] for row in rows)),
        "pain_point_frequency": dict(aggregate_pain_points.most_common()),
        "competitors": competitors,
        "unsupervised_clusters": cluster_summary,
    }
    OUTPUT.write_text(json.dumps(output, indent=2), encoding="utf-8")

    with ASSIGNMENTS.open("w", newline="", encoding="utf-8") as file:
        fields = ["competitor", "review_date", "rating", "sentiment_score", "sentiment", "cluster", "pain_points", "excerpt", "source_url"]
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                "competitor": row["competitor"],
                "review_date": row["review_date"],
                "rating": row["rating"],
                "sentiment_score": row["sentiment_score"],
                "sentiment": row["sentiment"],
                "cluster": row["cluster"],
                "pain_points": "; ".join(row["pain_points"]),
                "excerpt": row["excerpt"],
                "source_url": row["source_url"],
            })

    print(json.dumps({"rows": len(rows), "output": str(OUTPUT), "assignments": str(ASSIGNMENTS)}, indent=2))


if __name__ == "__main__":
    main()
