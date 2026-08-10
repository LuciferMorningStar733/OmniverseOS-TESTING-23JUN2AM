import pytest
from datetime import datetime, timezone, timedelta

def compute_hybrid_score(m, query):
    stop = {"i","a","an","the","is","it","my","me","you","do","did",
            "what","which","who","how","when","where","was","are","be",
            "have","has","can","could","would","should","will","and","or",
            "of","in","on","at","to","for","with","about","that","this"}
    qwords = set(query.lower().split()) - stop
    now_dt = datetime.now(timezone.utc)

    text = (m.get("title","") + " " + m.get("content","") + " " + m.get("category","")).lower()
    words = set(text.split()) - stop
    overlap = len(qwords & words) if qwords else 0
    similarity = (overlap * 2.5)

    created_str = m.get("created_at") or m.get("updated_at")
    hours_old = 720.0
    if created_str:
        try:
            dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            hours_old = max(0.0, (now_dt - dt).total_seconds() / 3600.0)
        except Exception:
            pass
    recency = max(0.1, 1.0 - (hours_old / 720.0))

    importance = float(m.get("importance_score", 0.5))
    nf_mult = 3.0 if m.get("never_forget") else 1.0
    pin_mult = 1.5 if m.get("pinned") else 1.0

    final_score = (similarity + recency + importance) * nf_mult * pin_mult

    reasons = []
    if overlap > 0:
        reasons.append(f"Matches {overlap} key term(s)")
    if m.get("never_forget"):
        reasons.append("Never Forget flag")
    if m.get("pinned"):
        reasons.append("Pinned")
    if recency > 0.8:
        reasons.append("Recent memory")

    reason_str = " · ".join(reasons) if reasons else "High importance score"
    return final_score, reason_str

def test_hybrid_memory_scoring():
    mem1 = {
        "title": "User preferences",
        "content": "User prefers dark mode and Python language",
        "category": "Tech",
        "importance_score": 0.8,
        "pinned": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    mem2 = {
        "title": "Old note",
        "content": "Shopping list for milk and bread",
        "category": "Personal",
        "importance_score": 0.2,
        "created_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
    }

    score1, reason1 = compute_hybrid_score(mem1, "Python programming")
    score2, reason2 = compute_hybrid_score(mem2, "Python programming")

    assert score1 > score2
    assert "Matches 1 key term(s)" in reason1
    assert "Pinned" in reason1
