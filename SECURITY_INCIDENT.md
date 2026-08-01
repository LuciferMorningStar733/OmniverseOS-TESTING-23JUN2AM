# RC1 Security Incident — 2026-08-01

## Summary

An **Emergent Universal LLM key** value was inadvertently written into
`test_result.md` by an automated testing pass and committed to
`origin/main` in commit `5d42fc7` (`auto-commit for 05b994da-…`).

- **File:** `test_result.md`
- **Introduced in commit:** `5d42fc7`
- **Present in HEADs:** every commit from `5d42fc7` through `ac49a27`
- **Line count (at time of discovery):** 2 references

The key was written as part of a diagnostic comment explaining that the
backend expected `GEMINI_API_KEY` while the environment provided
`EMERGENT_LLM_KEY`.  The comment inadvertently pasted the literal value
of the key rather than a placeholder.

## Scope — what leaked

| Item | Type | Sensitive? |
|------|------|------------|
| `EMERGENT_LLM_KEY` value | Emergent Universal LLM proxy key | **YES — must rotate** |
| `MONGO_URL` | Reference to local mongo string only (`mongodb://localhost:27017`) | No |
| `DB_NAME` | Static name `omniverseos` | No |
| `JWT_SECRET` | Dev-only placeholder (`omniverseos-dev-secret-do-not-use-in-prod`), NOT a production secret | No — but change in prod anyway |
| `CORS_ORIGINS` | `*` | No |
| `REACT_APP_BACKEND_URL` (frontend/.env, disk only, gitignored) | `http://localhost:8001` (local dev) | No |

No production Gemini API key, no GitHub PAT, no third-party credential,
no database production credential, no Stripe / SendGrid / auth-provider
secret, and no user password entered Git history.

## Current status

- The literal value has been **redacted from HEAD** (this commit).
- The literal value is **still present in Git history** at commit
  `5d42fc7` and every commit up to (but not including) the redaction
  commit.  A normal deletion commit **does not** erase history —
  anyone with clone access can `git show 5d42fc7 -- test_result.md`
  and read the value.

## Required actions from the repository owner

1. **Rotate the Emergent Universal LLM key immediately.**
   In Emergent → Profile → Universal Key → regenerate.  This is the
   only remediation that actually invalidates the leaked value.
   Assume the leaked key is compromised.

2. **After rotation** (optional but recommended if the repo is public):
   rewrite Git history to remove the value.  The safest tool is
   [`git filter-repo`](https://github.com/newren/git-filter-repo):
   ```bash
   git filter-repo --replace-text <(echo 'sk-emergent-eEc8d826940E0349a8==REDACTED')
   git push --force-with-lease origin main
   ```
   This IS a destructive history rewrite; every collaborator will need
   to re-clone.  The agent will not perform this without explicit
   user authorization.

3. **Confirm no other credential exposure.**  A HEAD-tree scan for
   common secret patterns (`sk-…`, `AIzaSy…`, `ghp_…`, `xox…`,
   `Bearer …`) produced no other matches at HEAD.  A history-wide
   scan surfaced only the one leaked key documented above.

## Preventive controls now in place

- `.gitignore` already blocks `*.env`, `.env`, `.env.*`, `credentials.json`,
  `*.key`, `.credentials`, `memory/test_credentials.md` — no .env file
  has ever been tracked in this repo.
- `test_result.md` has been redacted at HEAD.
- Future automated writes into `test_result.md` should never paste
  literal secret values.  If a future testing pass discovers a
  misconfigured env var, it should log the **name** only, never the
  value.

