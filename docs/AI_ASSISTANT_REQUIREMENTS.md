# AI Assistant Integration Requirements

## Overview

This document formalizes the requirements for integrating an AI Assistant feature into the Humanly Editor. The AI Assistant will help users interact with their documents through natural language, performing tasks such as grammar checking, content rewriting, summarization, and more—while maintaining full traceability of all AI interactions.

---

## 1. Feature Summary

| Aspect | Description |
|--------|-------------|
| **Feature Name** | AI Assistant |
| **Location** | Editor page (packages/editor, packages/frontend) |
| **Purpose** | Enable natural language interaction for document editing assistance |
| **Key Capability** | Chat-based interface for AI-powered editing suggestions and content modifications |

---

## 2. Functional Requirements

### 2.1 AI Assistant Button

| ID | Requirement |
|----|-------------|
| FR-001 | An "AI Assistant" button SHALL be added to the Editor toolbar or as a floating action button |
| FR-002 | The button SHALL display an AI/assistant icon (e.g., sparkles, chat bubble, or robot icon) |
| FR-003 | The button SHALL visually indicate when AI chat panel is open (active state) |
| FR-004 | The button SHALL be accessible via keyboard shortcut (suggested: `Cmd/Ctrl + J`) |

### 2.2 AI Chat Panel

| ID | Requirement |
|----|-------------|
| FR-010 | When clicked, a chat panel SHALL open as a side panel or modal overlay |
| FR-011 | The panel SHALL support the following input methods: text input, voice-to-text (optional future enhancement) |
| FR-012 | The panel SHALL display conversation history within the current session |
| FR-013 | The panel SHALL support markdown rendering for AI responses |
| FR-014 | The panel SHALL have a clear/reset conversation button |
| FR-015 | The panel SHALL be dismissible (close button, Escape key, or clicking outside) |
| FR-016 | The panel SHALL be resizable (drag to adjust width) |

### 2.3 AI Request Types

The AI Assistant SHALL support the following request categories:

| ID | Category | Examples |
|----|----------|----------|
| FR-020 | Grammar & Spelling | "Check grammar", "Fix spelling errors", "Proofread this paragraph" |
| FR-021 | Content Rewriting | "Make this more formal", "Simplify this text", "Rewrite in active voice" |
| FR-022 | Summarization | "Summarize this document", "Create bullet points from selection" |
| FR-023 | Expansion | "Expand on this idea", "Add more detail to this section" |
| FR-024 | Translation | "Translate to Spanish", "Convert to British English" |
| FR-025 | Formatting | "Add headings", "Create a numbered list", "Format as a table" |
| FR-026 | Q&A | "What is this document about?", "Find mentions of [topic]" |
| FR-027 | References | "Add citations for this claim", "Suggest related sources" |

### 2.4 Editor Content Interaction

| ID | Requirement |
|----|-------------|
| FR-030 | The AI SHALL have read access to the full editor content |
| FR-031 | The AI SHALL have access to the current text selection (if any) |
| FR-032 | The AI SHALL be able to suggest modifications to the editor content |
| FR-033 | Suggested modifications SHALL be presented as a diff/preview before applying |
| FR-034 | Users SHALL be able to accept, reject, or modify AI suggestions |
| FR-035 | Applied changes SHALL be integrated into the editor's undo/redo history |
| FR-036 | The AI SHALL respect the current cursor position for insertions |

### 2.5 Logging & Traceability

| ID | Requirement |
|----|-------------|
| FR-040 | ALL AI interactions SHALL be persistently logged |
| FR-041 | Each log entry SHALL include: timestamp, user query, AI response, document context |
| FR-042 | Each log entry SHALL include modifications made (before/after diff) |
| FR-043 | Logs SHALL be queryable by session, document, user, and time range |
| FR-044 | A "Logs" panel SHALL display AI interaction history |
| FR-045 | Log entries SHALL be expandable to show full details |
| FR-046 | Logs SHALL support export (JSON, CSV) |
| FR-047 | AI logs SHALL integrate with existing event tracking system |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| ID | Requirement |
|----|-------------|
| NFR-001 | AI responses SHALL begin streaming within 2 seconds of request |
| NFR-002 | The chat panel SHALL not block editor interaction |
| NFR-003 | Log writes SHALL be asynchronous and not impact UI responsiveness |

### 3.2 Security

| ID | Requirement |
|----|-------------|
| NFR-010 | AI requests SHALL be authenticated with user credentials |
| NFR-011 | Document content sent to AI SHALL be encrypted in transit (HTTPS) |
| NFR-012 | AI logs SHALL respect document access permissions |
| NFR-013 | Rate limiting SHALL be applied to AI requests (suggested: 20 requests/minute) |

### 3.3 Accessibility

| ID | Requirement |
|----|-------------|
| NFR-020 | Chat panel SHALL be keyboard navigable |
| NFR-021 | AI responses SHALL be screen reader compatible |
| NFR-022 | Focus management SHALL follow WAI-ARIA guidelines |

### 3.4 Scalability

| ID | Requirement |
|----|-------------|
| NFR-030 | AI service SHALL support horizontal scaling |
| NFR-031 | Log storage SHALL support high-volume writes |
| NFR-032 | WebSocket connections for streaming SHALL be efficiently managed |

---

## 4. User Interface Specifications

### 4.1 AI Assistant Button

```
┌─────────────────────────────────────────────────────────────┐
│  [B] [I] [U] ... [Font] [Size] ... │ [✨ AI Assistant]     │
└─────────────────────────────────────────────────────────────┘
                    Toolbar                    AI Button
```

**Button States:**
- Default: Outlined/ghost style with icon
- Hover: Highlighted with tooltip "AI Assistant (Cmd+J)"
- Active: Filled/primary style indicating panel is open
- Loading: Spinner when AI is processing

### 4.2 Chat Panel Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Editor (60%)                        │  AI Assistant Panel (40%)       │
│                                      │  ┌─────────────────────────────┐│
│  [Document Content]                  │  │ ✨ AI Assistant      [X]   ││
│                                      │  ├─────────────────────────────┤│
│                                      │  │                             ││
│                                      │  │  User: "Check grammar"      ││
│                                      │  │                             ││
│                                      │  │  AI: "Found 3 issues:       ││
│                                      │  │  1. 'their' → 'there'       ││
│                                      │  │  2. Missing comma...        ││
│                                      │  │                             ││
│                                      │  │  [Apply All] [View Diff]    ││
│                                      │  │                             ││
│                                      │  ├─────────────────────────────┤│
│                                      │  │ Type a message...    [Send] ││
│                                      │  └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Logs Panel Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Tabs: [Chat] [Logs]                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  📋 AI Interaction Logs                             [Export ▼] [Filter] │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 🕐 2024-01-15 14:32:05                                    [Expand] ││
│  │ Query: "Fix grammar in paragraph 2"                                ││
│  │ Result: 3 corrections applied                                      ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ 🕐 2024-01-15 14:30:12                                    [Expand] ││
│  │ Query: "Summarize document"                                        ││
│  │ Result: Summary generated (124 words)                              ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ 🕐 2024-01-15 14:28:45                                    [Expand] ││
│  │ Query: "Make this more formal"                                     ││
│  │ Result: Rewrite applied to selection                               ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**Expanded Log Entry:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🕐 2024-01-15 14:32:05                                                  │
│                                                                         │
│ User Query:                                                             │
│ "Fix grammar in paragraph 2"                                            │
│                                                                         │
│ AI Response:                                                            │
│ Found 3 grammatical issues in paragraph 2:                              │
│ 1. Line 4: "their" should be "there" (context: "...over their...")      │
│ 2. Line 6: Missing comma after introductory clause                      │
│ 3. Line 8: Subject-verb agreement ("data are" → "data is")              │
│                                                                         │
│ Content Modified: Yes                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ - The team put their results over their on the table.               ││
│ │ + The team put their results over there on the table.               ││
│ │                                                                      ││
│ │ - However the experiment showed...                                  ││
│ │ + However, the experiment showed...                                 ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ Session: doc_abc123 | User: user_xyz | Duration: 1.2s                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Models

### 5.1 AI Interaction Log

```typescript
interface AIInteractionLog {
  id: string;                          // Unique identifier
  documentId: string;                  // Associated document
  userId: string;                      // User who made the request
  sessionId: string;                   // Session identifier
  timestamp: Date;                     // When the interaction occurred

  // Request
  query: string;                       // User's original query
  queryType: AIQueryType;              // Categorized query type
  contextSnapshot: {                   // Document state at time of request
    fullContent?: string;              // Full document content (optional)
    selection?: {                      // Selected text, if any
      text: string;
      startOffset: number;
      endOffset: number;
    };
    cursorPosition: number;
  };

  // Response
  response: string;                    // AI's response text
  suggestions?: AISuggestion[];        // Structured suggestions
  responseTime: number;                // Time to generate response (ms)
  tokensUsed?: {                       // Token usage (if applicable)
    input: number;
    output: number;
  };

  // Modifications
  modificationsApplied: boolean;       // Whether changes were applied
  modifications?: ContentModification[];

  // Metadata
  modelVersion: string;                // AI model version used
  status: 'success' | 'error' | 'cancelled';
  errorMessage?: string;
}

type AIQueryType =
  | 'grammar_check'
  | 'spelling_check'
  | 'rewrite'
  | 'summarize'
  | 'expand'
  | 'translate'
  | 'format'
  | 'question'
  | 'reference'
  | 'other';

interface AISuggestion {
  id: string;
  type: 'replace' | 'insert' | 'delete' | 'format';
  originalText?: string;
  suggestedText?: string;
  location: {
    startOffset: number;
    endOffset: number;
  };
  explanation?: string;
  applied: boolean;
}

interface ContentModification {
  id: string;
  type: 'replace' | 'insert' | 'delete';
  before: string;
  after: string;
  location: {
    startOffset: number;
    endOffset: number;
  };
  timestamp: Date;
}
```

### 5.2 AI Chat Message

```typescript
interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    suggestions?: AISuggestion[];
    attachments?: {
      type: 'selection' | 'document';
      content: string;
    }[];
  };
}

interface AIChatSession {
  id: string;
  documentId: string;
  userId: string;
  messages: AIChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'closed';
}
```

---

## 6. API Endpoints

### 6.1 REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ai/chat` | Send a message to AI assistant |
| GET | `/api/v1/ai/sessions/:documentId` | Get chat sessions for a document |
| GET | `/api/v1/ai/logs` | Get AI interaction logs (with filters) |
| GET | `/api/v1/ai/logs/:logId` | Get specific log entry details |
| POST | `/api/v1/ai/apply-suggestion` | Apply an AI suggestion to document |
| DELETE | `/api/v1/ai/sessions/:sessionId` | Clear chat session |

### 6.2 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `ai:message` | Client → Server | Send user message |
| `ai:response` | Server → Client | AI response chunk (streaming) |
| `ai:response-complete` | Server → Client | AI response finished |
| `ai:suggestion` | Server → Client | AI suggestion for editor |
| `ai:error` | Server → Client | Error in AI processing |

---

## 7. Behavior Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI ASSISTANT INTERACTION FLOW                     │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  User    │
    │  clicks  │
    │  AI btn  │
    └────┬─────┘
         │
         ▼
    ┌──────────────────┐
    │ Open AI Chat     │
    │ Panel            │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐      ┌──────────────────┐
    │ User types       │      │ Capture context: │
    │ request          │─────▶│ - Selection      │
    └────────┬─────────┘      │ - Full content   │
             │                │ - Cursor pos     │
             │                └────────┬─────────┘
             │                         │
             ▼                         ▼
    ┌──────────────────────────────────────────┐
    │         Submit to AI Service              │
    │   POST /api/v1/ai/chat                   │
    │   (or WebSocket: ai:message)             │
    └────────────────────┬─────────────────────┘
                         │
                         ▼
    ┌──────────────────────────────────────────┐
    │         LOG INTERACTION                   │
    │   - Store query + context                │
    │   - Generate log entry ID                │
    └────────────────────┬─────────────────────┘
                         │
                         ▼
    ┌──────────────────────────────────────────┐
    │         AI PROCESSES REQUEST              │
    │   - Analyze query type                   │
    │   - Generate response                    │
    │   - Stream response chunks               │
    └────────────────────┬─────────────────────┘
                         │
                         ▼
    ┌──────────────────────────────────────────┐
    │         DISPLAY RESPONSE                  │
    │   - Show in chat panel                   │
    │   - Render suggestions (if any)          │
    └────────────────────┬─────────────────────┘
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
    ┌────────────────┐      ┌────────────────┐
    │ Has suggestions│      │ Info response  │
    │ for editor?    │      │ only (Q&A)     │
    └───────┬────────┘      └───────┬────────┘
            │                       │
            ▼                       │
    ┌────────────────┐              │
    │ Show diff/     │              │
    │ preview        │              │
    └───────┬────────┘              │
            │                       │
            ▼                       │
    ┌────────────────────┐          │
    │ User accepts?      │          │
    │ [Accept] [Reject]  │          │
    └───────┬────────────┘          │
            │                       │
    ┌───────┴───────┐               │
    │               │               │
    ▼               ▼               │
┌────────┐    ┌────────┐            │
│ Accept │    │ Reject │            │
└───┬────┘    └───┬────┘            │
    │             │                 │
    ▼             │                 │
┌────────────────┐│                 │
│ Apply changes  ││                 │
│ to editor      ││                 │
└───────┬────────┘│                 │
        │         │                 │
        ▼         ▼                 ▼
    ┌──────────────────────────────────────────┐
    │         UPDATE LOG ENTRY                  │
    │   - Store AI response                    │
    │   - Store modification (if applied)      │
    │   - Mark as complete                     │
    └────────────────────┬─────────────────────┘
                         │
                         ▼
    ┌──────────────────────────────────────────┐
    │         LOGS PANEL UPDATED                │
    │   - New entry appears                    │
    │   - Expandable for full details          │
    └──────────────────────────────────────────┘
```

---

## 8. Integration Points

### 8.1 Editor Package (packages/editor)

**New Components:**
- `AIAssistantButton` - Toolbar button component
- `AIAssistantPanel` - Side panel chat interface
- `AISuggestionOverlay` - Inline suggestion preview
- `AIAssistantPlugin` - Lexical plugin for editor integration

**Modified Components:**
- `ToolbarPlugin` - Add AI Assistant button
- `LexicalEditor` - Add AI panel state and callbacks

### 8.2 Frontend Package (packages/frontend)

**New Components:**
- `AILogsPanel` - Logs display component
- `AILogEntry` - Individual log entry component
- `AILogFilters` - Filter controls for logs

**New Hooks:**
- `useAIChat` - Manage AI chat state
- `useAILogs` - Fetch and manage AI logs
- `useAISuggestions` - Manage suggestion state

**New Store (Zustand):**
- `ai-store.ts` - AI assistant state management

### 8.3 Backend Package (packages/backend)

**New Routes:**
- `routes/ai.routes.ts` - AI-related endpoints

**New Controllers:**
- `controllers/ai.controller.ts` - Request handling

**New Services:**
- `services/ai.service.ts` - AI provider integration
- `services/ai-log.service.ts` - Logging service

**New Models:**
- `models/ai-log.model.ts` - Database operations for logs

**New WebSocket Handlers:**
- `websocket/handlers/ai.handler.ts` - Real-time AI events

### 8.4 Database

**New Tables:**
```sql
-- AI chat sessions
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI chat messages
CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id),
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI interaction logs
CREATE TABLE ai_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  session_id UUID REFERENCES ai_chat_sessions(id),

  -- Request
  query TEXT NOT NULL,
  query_type VARCHAR(50),
  context_snapshot JSONB,

  -- Response
  response TEXT,
  suggestions JSONB,
  response_time_ms INTEGER,
  tokens_used JSONB,

  -- Modifications
  modifications_applied BOOLEAN DEFAULT FALSE,
  modifications JSONB,

  -- Metadata
  model_version VARCHAR(100),
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX idx_ai_logs_document ON ai_interaction_logs(document_id);
CREATE INDEX idx_ai_logs_user ON ai_interaction_logs(user_id);
CREATE INDEX idx_ai_logs_created ON ai_interaction_logs(created_at DESC);
```

---

## 9. Configuration

### 9.1 Environment Variables

```bash
# AI Service Configuration
AI_PROVIDER=openai                    # AI provider (openai, anthropic, etc.)
AI_API_KEY=sk-...                     # API key for AI provider
AI_MODEL=gpt-4-turbo                  # Model to use
AI_MAX_TOKENS=4096                    # Maximum response tokens
AI_TEMPERATURE=0.7                    # Response creativity (0-1)

# Rate Limiting
AI_RATE_LIMIT_REQUESTS=20             # Requests per minute per user
AI_RATE_LIMIT_WINDOW=60000            # Rate limit window (ms)

# Logging
AI_LOG_RETENTION_DAYS=90              # How long to keep logs
AI_LOG_CONTENT_ENABLED=true           # Log full content (privacy consideration)
```

### 9.2 Feature Flags

```typescript
interface AIFeatureFlags {
  enabled: boolean;                    // Master toggle
  streamingEnabled: boolean;           // Enable streaming responses
  suggestionsEnabled: boolean;         // Enable inline suggestions
  logsEnabled: boolean;                // Enable logging
  maxContextLength: number;            // Max document context to send
  allowedQueryTypes: AIQueryType[];    // Enabled query types
}
```

---

## 10. Testing Requirements

### 10.1 Unit Tests

- AI service request/response handling
- Log creation and retrieval
- Suggestion parsing and application
- Chat message formatting

### 10.2 Integration Tests

- End-to-end chat flow
- WebSocket streaming
- Log persistence
- Editor content modification

### 10.3 E2E Tests

- User opens AI panel
- User sends query and receives response
- User applies suggestion
- Log appears in Logs panel
- Export logs functionality

---

## 11. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | User can open AI Assistant panel from editor toolbar |
| AC-002 | User can type a question and receive an AI response |
| AC-003 | AI can suggest modifications to editor content |
| AC-004 | User can accept or reject AI suggestions |
| AC-005 | Accepted changes are applied to the editor |
| AC-006 | All AI interactions are logged |
| AC-007 | Logs are viewable in the Logs panel |
| AC-008 | Logs show query, response, and modifications |
| AC-009 | Logs can be filtered by date, type, and status |
| AC-010 | Logs can be exported |

---

## 12. Future Enhancements (Out of Scope)

The following are considered for future iterations:

- Voice input for AI queries
- Multi-language support for AI interface
- Custom AI prompts/personas
- AI-powered auto-complete while typing
- Collaborative AI (multiple users, shared context)
- AI suggestion history with rollback
- AI usage analytics dashboard
- Integration with external reference databases

---

## Appendix A: Component Hierarchy

```
<EditorPage>
├── <ToolbarPlugin>
│   ├── [formatting controls]
│   └── <AIAssistantButton />
│
├── <LexicalEditor>
│   ├── [editor content]
│   └── <AISuggestionOverlay />    (when suggestion active)
│
└── <AIAssistantPanel>             (when panel open)
    ├── <AIAssistantHeader>
    │   └── [title, close button]
    ├── <AIChatMessages>
    │   └── <AIChatMessage />[]
    ├── <AIChatInput>
    │   └── [text input, send button]
    └── <AILogsTab>                (tabbed view)
        ├── <AILogFilters />
        └── <AILogEntry />[]
```

---

## Appendix B: Event Types for Tracking

New event types to add to `@humory/shared`:

```typescript
// Add to EventType union
type AIEventType =
  | 'ai_panel_open'
  | 'ai_panel_close'
  | 'ai_query_sent'
  | 'ai_response_received'
  | 'ai_suggestion_shown'
  | 'ai_suggestion_accepted'
  | 'ai_suggestion_rejected'
  | 'ai_modification_applied'
  | 'ai_logs_viewed'
  | 'ai_logs_exported';
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | AI Assistant | Initial requirements document |
