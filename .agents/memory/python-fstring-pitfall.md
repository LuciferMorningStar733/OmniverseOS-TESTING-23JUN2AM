---
name: Python f-string double-quote syntax pitfall
description: f-strings with double-quoted content inside double-quoted strings crash Python at import time
---

## The Bug
```python
# WRONG — crashes at import/startup with SyntaxError
"excerpt": f"Session title matches "{q}"",

# CORRECT — use single quotes for the f-string outer wrapper
"excerpt": f'Session title matches "{q}"',
```

**Why:** Python does not allow the same quote character inside an f-string expression without escaping. This is a parse-time error that prevents the entire module from loading, blocking ALL endpoints — not just the broken route.

**How to apply:** Whenever an f-string value needs to embed double-quoted content, use single quotes for the outer f-string delimiter (or escape the inner quotes).

**Detection:** The code review architect caught this. It won't be caught by JS-based brace-counting checks — always verify Python syntax with `python3 -c "import ast; ast.parse(open('server.py').read())"` before committing backend changes.
