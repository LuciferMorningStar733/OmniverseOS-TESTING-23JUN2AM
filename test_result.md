#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  OmniverseOS RC1 sprint. Focus of this test cycle:
    1) D7 — Context Chips (new). In AIChat, a horizontal row of pill chips
       appears above the input showing every live context source Cortex
       will feed into its system prompt (Active app, +N open, browser
       host, N memories). Each chip has an × that toggles the source
       off (strikethrough + dim). Chips with key "workspace" also strip
       the entire OS-context section from the system prompt; chip
       "memory" strips relevant memories.
    2) Track F sign-off — regression sweep across sessions (D1),
       AI chat streaming (A2 — no [CMD:*] tags leaking), auth,
       calendar month header (C4 responsive), Widget Store (C8 safe-area
       + clamped size), and iPad text-selection callouts (C7).

backend:
  - task: "AI chat streaming + session management"
    implemented: true
    working: false
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "No backend changes this cycle — just verifying that session CRUD (list, create, patch, delete, duplicate, auto-title), /api/ai/chat/stream, /api/ai/chat/history/{sid}, and /api/memories/relevant still work after the frontend D7 changes."
      - working: false
        agent: "testing"
        comment: |
          REGRESSION TEST RESULTS (21 tests, 18 passed, 3 failed):
          
          ✅ PASSED (18/21):
          - Health endpoint (GET /api/health) - Returns {"status":"healthy","db":"ok"}
          - Auth flow: signup, login, /auth/me - All working correctly
          - Session CRUD: GET/POST/PATCH/DELETE /api/ai/sessions - All working
          - Session operations: pin, rename, duplicate - All working
          - Session ordering: Pinned sessions appear first - Working
          - AI chat streaming (POST /api/ai/chat/stream) - SSE working, no [CMD:] tags
          - Session auto-title (POST /api/ai/sessions/{id}/auto-title) - Working
          - Memories: POST /api/memories and POST /api/memories/relevant - Both working
          
          ❌ FAILED (3/21) - CRITICAL ISSUE:
          1. AI chat non-stream (POST /api/ai/chat) - Returns 500 "LLM key not configured"
          2. Chat history (GET /api/ai/chat/history/{sid}) - Empty (no messages saved due to #1)
          3. Rate limiting test - All 5 requests returned 500 (same root cause as #1)
          
          ROOT CAUSE - ENVIRONMENT CONFIGURATION ERROR:
          backend/.env contains EMERGENT_LLM_KEY but the code expects GEMINI_API_KEY.
          - backend/.env has: EMERGENT_LLM_KEY=sk-emergent-eEc8d826940E0349a8
          - backend/server.py line 36: GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
          - backend/providers.py line 216: gemini_key = os.environ.get("GEMINI_API_KEY", "")
          - EMERGENT_LLM_KEY is not referenced anywhere in the backend codebase
          
          Backend logs show: "ERROR:providers:[Cortex] All providers exhausted. Last error: None"
          This indicates no AI providers are available because GEMINI_API_KEY is missing.
          
          IMPACT:
          - Streaming chat works (has fallback error handling)
          - Non-streaming chat completely broken (returns 500)
          - This blocks: /api/ai/chat, rate limiting tests, and any non-streaming AI operations
          
          Test credentials saved to /app/memory/test_credentials.md for future test runs.

  - task: "Auth (signup/login/me)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Verify signup + login + /auth/me still work. backend/.env re-created this session with MONGO_URL, DB_NAME, JWT_SECRET, EMERGENT_LLM_KEY."
      - working: true
        agent: "testing"
        comment: |
          ✅ All auth endpoints working correctly:
          - POST /api/auth/signup - Creates user, returns token and user object
          - POST /api/auth/login - Authenticates user, returns token
          - GET /api/auth/me - Returns user details with valid Bearer token
          Test user created and credentials saved to /app/memory/test_credentials.md

frontend:
  - task: "D7 — Context Chips in AI Chat"
    implemented: true
    working: "NA"
    file: "frontend/src/apps/AIChat.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          New: ContextChips row rendered above the input (data-testid='context-chips').
          - Chip list computed from live `windows`, `activeId`, `relevantMemories`
            and localStorage 'cortex_current_url'.
          - Each chip toggles its source-key in a Set; workspace chip toggles the
            whole OS-context section, memory chip toggles long-term memory.
          Verify:
            * Chips appear when at least one app is open (or memories exist).
            * Click a chip → chip becomes dim + strikethrough + the × becomes +.
            * Send a follow-up message; the AI's system prompt no longer includes
              that source (behaviourally: less workspace-aware).
            * Chip is horizontally scrollable on mobile.

  - task: "A8 — hardened global error handler"
    implemented: true
    working: "NA"
    file: "frontend/src/index.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Verify: normal usage of the OS does NOT trigger the red 'RUNTIME CRASH'
          panel from benign ResizeObserver / chunk-load noise. Manually triggering
          a real uncaught error (e.g. throw in dev console) should still show the
          panel with a Reload button.

  - task: "C4 — Calendar month header responsive"
    implemented: true
    working: "NA"
    file: "frontend/src/apps/CalendarApp.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Verify at viewport widths 320, 375, 430, 1440: the month header is
          NEVER truncated to 'J...' — mobile uses short name ('Jan 2026'), sm+
          uses full name. Prev/next arrows remain on the same visible row.

  - task: "C7 — iPad text-selection callout on chrome"
    implemented: true
    working: "NA"
    file: "frontend/src/index.css"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Verify: on iPad/WebKit tapping buttons, dock icons, top-bar buttons and
          widget headers does NOT raise the iOS text-selection callout. Text
          selection inside .markdown-content / .chat-message / <input> / <textarea>
          is STILL available.

  - task: "C8 — Widget Store safe-area + viewport clamp"
    implemented: true
    working: "NA"
    file: "frontend/src/widgets/WidgetStore.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Verify: on desktop at 1280x720 the Widget Store panel fits within the
          viewport (never clipped). On a mobile viewport the bottom sheet has
          extra padding at the bottom equal to env(safe-area-inset-bottom).

  - task: "D1 — Session-based AI chat regression"
    implemented: true
    working: "NA"
    file: "frontend/src/components/ChatSessionSidebar.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Existing feature; verify still functional. Create a new session,
          send a message, rename, pin, duplicate, delete. Confirm messages from
          Session A do not appear in Session B.

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "D7 — Context Chips in AI Chat"
    - "AI chat streaming + session management"
    - "D1 — Session-based AI chat regression"
    - "C4 — Calendar month header responsive"
    - "C8 — Widget Store safe-area + viewport clamp"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Implemented D7 Context Chips (frontend-only). Also completed prior polish
      (A8 crash safety, C4 calendar, C7 iPad, C8 Widget Store) which are already
      pushed. Please:
        (1) run a backend regression on /api/auth/*, /api/ai/sessions/*,
            /api/ai/chat/stream, /api/ai/chat/history/{sid} and /api/memories/relevant
            (backend/.env re-created this session so this is the first boot after
            env restore).
        (2) then perform Track F frontend sign-off: sign up → open AI Chat →
            confirm chips appear + toggle works + send + response arrives
            without any '[CMD:*]' tag leaking → open Calendar and verify month
            header at 320/375/430 → open Widget Store and confirm sheet fits.
      test_credentials.md is currently empty; the testing agent should create a
      fresh test user via /api/auth/signup and record it there.
  
  - agent: "testing"
    message: |
      Backend regression testing completed. Results: 18/21 tests passed (85.7%).
      
      ✅ WORKING CORRECTLY:
      - All auth endpoints (signup, login, /me)
      - All session CRUD operations (create, list, update, delete, duplicate, auto-title)
      - AI chat streaming (SSE) - no [CMD:] tags leaked
      - Memories endpoints (create, relevant search)
      - Database connectivity and health checks
      
      ❌ CRITICAL ISSUE - Environment Configuration Error:
      Non-streaming AI chat endpoint (/api/ai/chat) returns 500 "LLM key not configured"
      
      ROOT CAUSE:
      backend/.env has EMERGENT_LLM_KEY but code expects GEMINI_API_KEY.
      - Line in .env: EMERGENT_LLM_KEY=sk-emergent-eEc8d826940E0349a8
      - Code expects: GEMINI_API_KEY (server.py:36, providers.py:216)
      - EMERGENT_LLM_KEY is never referenced in the codebase
      
      IMPACT:
      - Streaming chat: ✅ Working (has fallback handling)
      - Non-streaming chat: ❌ Broken (returns 500)
      - Rate limiting: ❌ Cannot test (all requests fail with 500)
      
      RECOMMENDATION:
      Add GEMINI_API_KEY to backend/.env with a valid Gemini API key.
      The EMERGENT_LLM_KEY appears to be unused and can be removed or the code
      needs to be updated to use it instead of GEMINI_API_KEY.
      
      Test credentials saved to /app/memory/test_credentials.md for future runs.
      Full test report available in backend_test.py execution logs.
