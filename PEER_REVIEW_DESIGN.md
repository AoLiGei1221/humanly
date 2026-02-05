# Peer Review Feature Design Document

## Executive Summary

This document outlines the architecture and implementation plan for adding a peer-review capability to Humanly, targeting OpenReview/academic peer review workflows. The feature creates a controlled review environment that prevents direct paper downloads while maintaining full provenance tracking and AI-assisted review capabilities.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [API Design](#api-design)
5. [Frontend Architecture](#frontend-architecture)
6. [PDF Viewer Implementation](#pdf-viewer-implementation)
7. [Screen & Camera Recording](#screen--camera-recording)
8. [Security & Permissions](#security--permissions)
9. [Integration with Existing Systems](#integration-with-existing-systems)
10. [Implementation Phases](#implementation-phases)

---

## 1. Problem Statement

### Current Issue
In conference peer review, reviewers may rely heavily on LLMs to generate reviews, leading to factual/logical mistakes that could result in incorrect paper rejections.

### Solution Goals
1. **Prevent paper downloads** - Papers can only be read within our system
2. **Encourage careful reading** - PDF viewer integrated with review workflow
3. **Support human review** - AI assists but doesn't replace careful analysis
4. **Maintain provenance** - Track all review writing activities
5. **Optional recordings** - Screen and camera capture with user consent

---

## 2. System Architecture

### 2.1 Three-Component Interface

```
┌─────────────────────────────────────────────────────────────┐
│                    Reviewer Workspace                        │
├──────────────────┬──────────────────┬───────────────────────┤
│                  │                  │                       │
│   PDF Viewer     │   Editor Panel   │   AI Assistant        │
│   (Read-Only)    │   (Lexical)      │   (Context-Aware)     │
│                  │                  │                       │
│   - Upload PDF   │   - Review text  │   - Paper Q&A        │
│   - No download  │   - Tracking on  │   - Logic checking   │
│   - Annotations  │   - Auto-save    │   - Citation help    │
│   - Search       │   - Versions     │   - Fact verification│
│                  │                  │                       │
└──────────────────┴──────────────────┴───────────────────────┘
         │                  │                    │
         └──────────────────┴────────────────────┘
                            │
                    WebSocket Server
                            │
                    Backend Services
                   (Express + Socket.IO)
                            │
              ┌─────────────┴─────────────┐
              │                           │
         PostgreSQL                  File Storage
    (TimescaleDB + Review Data)   (PDF Blobs/S3)
```

### 2.2 Architecture Components

#### Backend Services (New)
- **ReviewService** - Core review workflow logic
- **ReviewerService** - Reviewer assignment and permissions
- **PaperStorageService** - Secure PDF storage and streaming
- **RecordingService** - Screen/camera recording management
- **ReviewAIService** - Extends AIService for review-specific assistance

#### Frontend Components (New)
- **ReviewWorkspace** - Main 3-panel layout
- **PDFViewer** - Secure PDF rendering (no download)
- **ReviewEditor** - Extends existing Lexical editor
- **ReviewAssistant** - AI panel for review support
- **RecordingControls** - Permission and recording UI

---

## 3. Database Schema

### 3.1 New Tables

```sql
-- Papers submitted for review
CREATE TABLE papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    authors TEXT[], -- Array of author names
    abstract TEXT,
    keywords TEXT[],
    submission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- File storage
    pdf_storage_key VARCHAR(500) NOT NULL, -- S3 key or blob ID
    pdf_file_size INTEGER NOT NULL,
    pdf_page_count INTEGER,
    pdf_checksum VARCHAR(64) NOT NULL, -- SHA-256 hash

    -- Review metadata
    review_deadline TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
    -- Statuses: pending_review, under_review, review_complete, accepted, rejected

    -- Provenance
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_papers_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_papers_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX idx_papers_project_id ON papers(project_id);
CREATE INDEX idx_papers_status ON papers(status);
CREATE INDEX idx_papers_submission_date ON papers(submission_date DESC);

-- Reviewer assignments
CREATE TABLE paper_reviewers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Reviewer access control
    can_view_paper BOOLEAN NOT NULL DEFAULT TRUE,
    can_write_review BOOLEAN NOT NULL DEFAULT TRUE,
    can_access_ai BOOLEAN NOT NULL DEFAULT TRUE,

    -- Review progress
    review_status VARCHAR(50) NOT NULL DEFAULT 'assigned',
    -- Statuses: assigned, in_progress, submitted, revision_requested, final
    review_started_at TIMESTAMPTZ,
    review_submitted_at TIMESTAMPTZ,

    -- Reading time tracking
    total_reading_time_seconds INTEGER DEFAULT 0,
    paper_opened_count INTEGER DEFAULT 0,

    UNIQUE(paper_id, reviewer_id),
    CONSTRAINT fk_reviewer_paper FOREIGN KEY (paper_id) REFERENCES papers(id),
    CONSTRAINT fk_reviewer_user FOREIGN KEY (reviewer_id) REFERENCES users(id),
    CONSTRAINT fk_reviewer_assigner FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE INDEX idx_paper_reviewers_paper_id ON paper_reviewers(paper_id);
CREATE INDEX idx_paper_reviewers_reviewer_id ON paper_reviewers(reviewer_id);
CREATE INDEX idx_paper_reviewers_status ON paper_reviewers(review_status);

-- Review documents (extends existing documents table pattern)
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_reviewer_id UUID NOT NULL REFERENCES paper_reviewers(id) ON DELETE CASCADE,

    -- Lexical editor content (reuse existing pattern)
    content JSONB NOT NULL DEFAULT '{}', -- Lexical state
    plain_text TEXT,
    word_count INTEGER DEFAULT 0,
    character_count INTEGER DEFAULT 0,

    -- Review metadata
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- Statuses: draft, submitted, revision, final
    version INTEGER NOT NULL DEFAULT 1,

    -- Review scores/ratings (optional structured data)
    scores JSONB, -- { "novelty": 4, "soundness": 5, "clarity": 3, etc. }
    recommendation VARCHAR(50), -- accept, reject, revise, etc.
    confidence_level INTEGER, -- 1-5 scale

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,

    CONSTRAINT fk_reviews_paper FOREIGN KEY (paper_id) REFERENCES papers(id),
    CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id),
    CONSTRAINT fk_reviews_paper_reviewer FOREIGN KEY (paper_reviewer_id) REFERENCES paper_reviewers(id)
);

CREATE INDEX idx_reviews_paper_id ON reviews(paper_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_plain_text ON reviews USING gin(to_tsvector('english', plain_text));

-- Review events (TimescaleDB hypertable for keystroke tracking)
CREATE TABLE review_events (
    id UUID DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),

    -- Event data (same pattern as document_events)
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Context
    selection_text TEXT,
    cursor_position INTEGER,

    CONSTRAINT fk_review_events_review FOREIGN KEY (review_id) REFERENCES reviews(id),
    CONSTRAINT fk_review_events_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- Convert to TimescaleDB hypertable (partitioned by time)
SELECT create_hypertable('review_events', 'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

CREATE INDEX idx_review_events_review_id ON review_events(review_id, timestamp DESC);
CREATE INDEX idx_review_events_reviewer_id ON review_events(reviewer_id, timestamp DESC);

-- Review comments (for inline paper annotations)
CREATE TABLE review_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    paper_id UUID NOT NULL REFERENCES papers(id),

    -- PDF location
    page_number INTEGER NOT NULL,
    position_x FLOAT, -- Relative position on page (0-1)
    position_y FLOAT,
    selected_text TEXT, -- Text that was highlighted

    -- Comment content
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50), -- question, suggestion, error, praise, etc.

    -- Status
    is_resolved BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_review_comments_review FOREIGN KEY (review_id) REFERENCES reviews(id),
    CONSTRAINT fk_review_comments_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id),
    CONSTRAINT fk_review_comments_paper FOREIGN KEY (paper_id) REFERENCES papers(id)
);

CREATE INDEX idx_review_comments_review_id ON review_comments(review_id);
CREATE INDEX idx_review_comments_paper_id ON review_comments(paper_id, page_number);

-- AI interactions for reviews (extends existing ai_chat_sessions pattern)
CREATE TABLE review_ai_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    paper_id UUID NOT NULL REFERENCES papers(id),

    -- Session metadata
    session_name VARCHAR(200),
    context_snapshot JSONB, -- Paper excerpt + review draft state

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_review_ai_review FOREIGN KEY (review_id) REFERENCES reviews(id),
    CONSTRAINT fk_review_ai_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id),
    CONSTRAINT fk_review_ai_paper FOREIGN KEY (paper_id) REFERENCES papers(id)
);

CREATE INDEX idx_review_ai_sessions_review_id ON review_ai_sessions(review_id);

CREATE TABLE review_ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES review_ai_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,

    -- Message metadata
    paper_excerpt TEXT, -- Relevant paper section being discussed
    review_excerpt TEXT, -- Relevant review section being discussed

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_review_ai_messages_session FOREIGN KEY (session_id) REFERENCES review_ai_sessions(id)
);

CREATE INDEX idx_review_ai_messages_session_id ON review_ai_messages(session_id, created_at);

CREATE TABLE review_ai_interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES review_ai_sessions(id) ON DELETE SET NULL,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),

    -- Query details
    query_type VARCHAR(50) NOT NULL,
    -- Types: fact_check, logic_check, citation_check, clarification,
    --        summarize_section, compare_claims, etc.
    query_text TEXT NOT NULL,
    response_text TEXT NOT NULL,

    -- Performance metrics
    response_time_ms INTEGER,
    tokens_used INTEGER,
    model_used VARCHAR(100),

    -- Context
    paper_context TEXT, -- What part of paper was being discussed
    review_context TEXT, -- What part of review was being written

    -- User feedback
    suggestion_applied BOOLEAN DEFAULT FALSE,
    user_modified_text TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_review_ai_logs_session FOREIGN KEY (session_id) REFERENCES review_ai_sessions(id),
    CONSTRAINT fk_review_ai_logs_review FOREIGN KEY (review_id) REFERENCES reviews(id),
    CONSTRAINT fk_review_ai_logs_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

CREATE INDEX idx_review_ai_logs_review_id ON review_ai_interaction_logs(review_id, created_at DESC);
CREATE INDEX idx_review_ai_logs_query_type ON review_ai_interaction_logs(query_type);

-- Recording sessions (screen/camera)
CREATE TABLE review_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_reviewer_id UUID NOT NULL REFERENCES paper_reviewers(id) ON DELETE CASCADE,
    review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    paper_id UUID NOT NULL REFERENCES papers(id),

    -- Recording type
    recording_type VARCHAR(50) NOT NULL, -- 'screen', 'camera', 'both'

    -- Consent
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ,

    -- Recording metadata
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,

    -- Storage
    storage_key VARCHAR(500), -- S3 key or blob ID
    file_size INTEGER,
    format VARCHAR(50), -- 'webm', 'mp4', etc.

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'recording',
    -- Statuses: recording, stopped, processing, available, failed

    CONSTRAINT fk_review_recordings_paper_reviewer FOREIGN KEY (paper_reviewer_id) REFERENCES paper_reviewers(id),
    CONSTRAINT fk_review_recordings_review FOREIGN KEY (review_id) REFERENCES reviews(id),
    CONSTRAINT fk_review_recordings_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id),
    CONSTRAINT fk_review_recordings_paper FOREIGN KEY (paper_id) REFERENCES papers(id)
);

CREATE INDEX idx_review_recordings_paper_reviewer_id ON review_recordings(paper_reviewer_id);
CREATE INDEX idx_review_recordings_review_id ON review_recordings(review_id);

-- Paper access logs (track every time paper is viewed)
CREATE TABLE paper_access_logs (
    id UUID DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),

    -- Access details
    access_type VARCHAR(50) NOT NULL, -- 'open', 'page_view', 'zoom', 'search', 'close'
    page_number INTEGER,
    duration_seconds INTEGER, -- Time spent on this page

    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_paper_access_paper FOREIGN KEY (paper_id) REFERENCES papers(id),
    CONSTRAINT fk_paper_access_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('paper_access_logs', 'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

CREATE INDEX idx_paper_access_logs_paper_id ON paper_access_logs(paper_id, timestamp DESC);
CREATE INDEX idx_paper_access_logs_reviewer_id ON paper_access_logs(reviewer_id, timestamp DESC);
```

### 3.2 Database Migration Strategy

Create migration file: `packages/backend/src/db/migrations/005-peer-review-schema.sql`

This will integrate with existing migration system.

---

## 4. API Design

### 4.1 API Endpoints Structure

Following existing pattern: `/api/v1/papers/*` and `/api/v1/reviews/*`

#### Paper Management

```typescript
// Upload paper for review
POST   /api/v1/papers
Body: { title, authors[], abstract, keywords[], projectId, file: <multipart> }
Auth: Required (project admin)
Response: { paperId, uploadUrl?, checksum }

// Get paper metadata (no PDF content)
GET    /api/v1/papers/:paperId
Auth: Required (reviewer or admin)
Response: { id, title, authors, abstract, keywords, status, reviewDeadline, ... }

// List papers in project
GET    /api/v1/projects/:projectId/papers
Query: ?status=pending_review&sort=submission_date
Auth: Required (project member)
Response: { papers: [...], pagination }

// Get paper PDF stream (read-only, no download)
GET    /api/v1/papers/:paperId/content
Auth: Required (assigned reviewer)
Headers: Range support for chunked loading
Response: PDF stream with Content-Disposition: inline

// Update paper metadata
PATCH  /api/v1/papers/:paperId
Body: { title?, status?, reviewDeadline? }
Auth: Required (admin)

// Delete paper
DELETE /api/v1/papers/:paperId
Auth: Required (admin)
```

#### Reviewer Assignment

```typescript
// Assign reviewer to paper
POST   /api/v1/papers/:paperId/reviewers
Body: { reviewerId, permissions: { canViewPaper, canWriteReview, canAccessAI } }
Auth: Required (admin)
Response: { paperReviewerId, assignedAt }

// List reviewers for paper
GET    /api/v1/papers/:paperId/reviewers
Auth: Required (admin or assigned reviewer)
Response: { reviewers: [...] }

// Update reviewer permissions
PATCH  /api/v1/papers/:paperId/reviewers/:reviewerId
Body: { permissions: {...}, reviewStatus? }
Auth: Required (admin)

// Remove reviewer
DELETE /api/v1/papers/:paperId/reviewers/:reviewerId
Auth: Required (admin)

// Get my assigned papers (reviewer view)
GET    /api/v1/reviewers/me/papers
Query: ?status=assigned&sort=deadline
Auth: Required (any user)
Response: { papers: [...], pagination }
```

#### Review Management

```typescript
// Create review (auto-created on first paper access)
POST   /api/v1/papers/:paperId/reviews
Body: { /* initial content if any */ }
Auth: Required (assigned reviewer)
Response: { reviewId, status: 'draft' }

// Get review
GET    /api/v1/reviews/:reviewId
Auth: Required (review owner or admin)
Response: { id, content, plainText, wordCount, status, scores, ... }

// Update review (draft mode)
PATCH  /api/v1/reviews/:reviewId
Body: { content: <Lexical JSON>, scores?, recommendation? }
Auth: Required (review owner)
Response: { updated review }

// Submit review (final submission)
POST   /api/v1/reviews/:reviewId/submit
Body: { scores, recommendation, confidenceLevel }
Auth: Required (review owner)
Response: { status: 'submitted', submittedAt }

// Track review events (keystroke tracking)
POST   /api/v1/reviews/:reviewId/events
Body: { events: [{ eventType, eventData, timestamp, ... }] }
Auth: Required (review owner)
Response: { eventsTracked: count }

// Get review statistics
GET    /api/v1/reviews/:reviewId/stats
Auth: Required (review owner or admin)
Response: { wordCount, typingSpeed, pastePercentage, activeTime, ... }

// List reviews for paper
GET    /api/v1/papers/:paperId/reviews
Auth: Required (admin)
Response: { reviews: [...] }
```

#### Review Comments (PDF Annotations)

```typescript
// Add comment to paper
POST   /api/v1/reviews/:reviewId/comments
Body: { pageNumber, positionX, positionY, selectedText?, commentText, commentType }
Auth: Required (review owner)
Response: { commentId, createdAt }

// Get comments for review
GET    /api/v1/reviews/:reviewId/comments
Query: ?pageNumber=5
Auth: Required (review owner or admin)
Response: { comments: [...] }

// Update comment
PATCH  /api/v1/comments/:commentId
Body: { commentText?, isResolved? }
Auth: Required (comment owner)

// Delete comment
DELETE /api/v1/comments/:commentId
Auth: Required (comment owner)
```

#### Review AI Assistant

```typescript
// Create AI session
POST   /api/v1/reviews/:reviewId/ai/sessions
Body: { sessionName?, contextSnapshot }
Auth: Required (review owner with AI access)
Response: { sessionId }

// Send AI message (non-streaming)
POST   /api/v1/reviews/:reviewId/ai/sessions/:sessionId/messages
Body: { message, paperContext?, reviewContext?, queryType }
Auth: Required (review owner)
Response: { messageId, response, tokensUsed }

// Get AI session history
GET    /api/v1/reviews/:reviewId/ai/sessions/:sessionId/messages
Auth: Required (review owner or admin)
Response: { messages: [...] }

// Get AI interaction logs
GET    /api/v1/reviews/:reviewId/ai/logs
Query: ?queryType=fact_check&startDate=...
Auth: Required (review owner or admin)
Response: { logs: [...], pagination }

// WebSocket endpoint for streaming AI responses
WS     /api/v1/reviews/:reviewId/ai/stream
Events: ai:message, ai:response-chunk, ai:response-complete, ai:error
```

#### Recording Management

```typescript
// Request recording permissions
POST   /api/v1/papers/:paperId/recordings/request
Body: { recordingType: 'screen' | 'camera' | 'both' }
Auth: Required (assigned reviewer)
Response: { consentRequired: true, recordingId }

// Grant consent
POST   /api/v1/recordings/:recordingId/consent
Body: { consentGiven: boolean }
Auth: Required (reviewer)
Response: { consentTimestamp, status }

// Start recording
POST   /api/v1/recordings/:recordingId/start
Auth: Required (reviewer)
Response: { startedAt, status: 'recording' }

// Stop recording
POST   /api/v1/recordings/:recordingId/stop
Auth: Required (reviewer)
Response: { endedAt, durationSeconds, status }

// Upload recording chunk (streaming upload)
POST   /api/v1/recordings/:recordingId/upload
Body: <binary data or multipart>
Auth: Required (reviewer)

// Get recording metadata
GET    /api/v1/recordings/:recordingId
Auth: Required (reviewer or admin)
Response: { id, type, duration, status, storageKey, ... }

// List recordings for paper reviewer
GET    /api/v1/papers/:paperId/reviewers/:reviewerId/recordings
Auth: Required (admin)
Response: { recordings: [...] }
```

#### Analytics

```typescript
// Get paper reading analytics
GET    /api/v1/papers/:paperId/analytics/reading
Auth: Required (admin)
Response: {
  totalReadingTime,
  pageViewDistribution: [{page, timeSpent}],
  reviewerProgress: [{reviewerId, progress}]
}

// Get review writing analytics
GET    /api/v1/reviews/:reviewId/analytics
Auth: Required (review owner or admin)
Response: {
  writingTime,
  keystrokesVsPaste,
  aiInteractionCount,
  revisionsCount,
  activeTimeDistribution
}

// Get paper access logs
GET    /api/v1/papers/:paperId/access-logs
Query: ?reviewerId=...&startDate=...&endDate=...
Auth: Required (admin)
Response: { logs: [...], pagination }
```

### 4.2 WebSocket Events

Following existing pattern from `packages/backend/src/websocket/`

```typescript
// Review session events
'review:join' - Join review session room
'review:leave' - Leave review session room
'review:update' - Broadcast review updates to admins
'review:comment-added' - New comment notification

// AI streaming events
'review-ai:message' - Send message to AI
'review-ai:chunk' - Receive streaming response chunk
'review-ai:complete' - Response complete
'review-ai:error' - Error occurred

// Paper viewing events
'paper:page-changed' - Track page navigation
'paper:zoom-changed' - Track zoom level
'paper:search' - Track search queries

// Recording events
'recording:status' - Recording status updates
```

---

## 5. Frontend Architecture

### 5.1 New Pages (Next.js App Router)

```
packages/frontend/src/app/
├── (dashboard)/
│   └── projects/[id]/
│       └── papers/
│           ├── page.tsx                    # Paper list
│           ├── [paperId]/
│           │   ├── page.tsx                # Paper overview
│           │   ├── reviewers/
│           │   │   └── page.tsx            # Assign reviewers
│           │   ├── reviews/
│           │   │   └── page.tsx            # View all reviews (admin)
│           │   └── analytics/
│           │       └── page.tsx            # Paper analytics
│           └── upload/
│               └── page.tsx                # Upload paper form

packages/frontend-user/src/app/
├── reviews/
│   ├── page.tsx                            # My assigned papers
│   └── [reviewId]/
│       ├── page.tsx                        # Review workspace (3-panel)
│       ├── layout.tsx                      # Workspace layout
│       └── components/
│           ├── PDFViewer.tsx               # PDF viewer component
│           ├── ReviewEditor.tsx            # Review editor (Lexical)
│           ├── ReviewAssistant.tsx         # AI assistant panel
│           ├── CommentPanel.tsx            # Annotations panel
│           ├── RecordingControls.tsx       # Recording UI
│           └── ReviewSubmitDialog.tsx      # Submit review form
```

### 5.2 Review Workspace Layout

**File**: `packages/frontend-user/src/app/reviews/[reviewId]/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import PDFViewer from './components/PDFViewer'
import ReviewEditor from './components/ReviewEditor'
import ReviewAssistant from './components/ReviewAssistant'
import RecordingControls from './components/RecordingControls'

export default function ReviewWorkspace({ params }: { params: { reviewId: string } }) {
  const [review, setReview] = useState(null)
  const [paper, setPaper] = useState(null)
  const [layout, setLayout] = useState([35, 40, 25]) // [PDF%, Editor%, AI%]

  // Load review and paper data
  useEffect(() => {
    loadReviewData()
  }, [params.reviewId])

  return (
    <div className="h-screen flex flex-col">
      {/* Header Bar */}
      <header className="border-b p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{paper?.title}</h1>
          <p className="text-sm text-muted-foreground">
            {paper?.authors?.join(', ')}
          </p>
        </div>
        <div className="flex gap-2">
          <RecordingControls paperId={paper?.id} reviewId={review?.id} />
          <ReviewStatusBadge status={review?.status} />
          <ReviewSubmitButton reviewId={review?.id} />
        </div>
      </header>

      {/* 3-Panel Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanel defaultSize={layout[0]} minSize={20}>
          <PDFViewer
            paperId={paper?.id}
            onCommentAdd={handleCommentAdd}
            comments={comments}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={layout[1]} minSize={30}>
          <ReviewEditor
            reviewId={review?.id}
            initialContent={review?.content}
            onUpdate={handleReviewUpdate}
            trackingEnabled={true}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={layout[2]} minSize={20}>
          <ReviewAssistant
            reviewId={review?.id}
            paperId={paper?.id}
            paperContent={paper?.content}
            reviewContent={review?.content}
          />
        </ResizablePanel>
      </div>
    </div>
  )
}
```

---

## 6. PDF Viewer Implementation

### 6.1 Technology Choice

**Recommended**: [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla
- Browser-native rendering (no external dependencies)
- No download capability (renders canvas directly)
- Text selection support
- Annotation layer support
- Search functionality
- Mobile-responsive

**Alternative**: [React-PDF](https://github.com/wojtekmaj/react-pdf) (wrapper around PDF.js)

### 6.2 PDF Viewer Component

**File**: `packages/frontend-user/src/app/reviews/[reviewId]/components/PDFViewer.tsx`

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Search, MessageSquarePlus
} from 'lucide-react'
import { apiClient } from '@/lib/api'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PDFViewerProps {
  paperId: string
  onCommentAdd: (comment: {
    pageNumber: number
    positionX: number
    positionY: number
    selectedText?: string
  }) => void
  comments: Comment[]
}

export default function PDFViewer({ paperId, onCommentAdd, comments }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [searchText, setSearchText] = useState<string>('')
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [selectedText, setSelectedText] = useState<string>('')
  const [selection, setSelection] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load PDF stream URL
  useEffect(() => {
    const loadPDF = async () => {
      try {
        // Get authenticated streaming URL
        const response = await apiClient.get(`/papers/${paperId}/content`, {
          responseType: 'blob'
        })
        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)

        // Track paper access
        trackAccess('open')
      } catch (error) {
        console.error('Failed to load PDF:', error)
      }
    }
    loadPDF()

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [paperId])

  // Track page view duration
  useEffect(() => {
    const startTime = Date.now()
    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000)
      trackAccess('page_view', { pageNumber, duration })
    }
  }, [pageNumber])

  const trackAccess = async (type: string, data?: any) => {
    try {
      await apiClient.post(`/papers/${paperId}/access-logs`, {
        accessType: type,
        pageNumber: data?.pageNumber || pageNumber,
        durationSeconds: data?.duration
      })
    } catch (error) {
      // Silent fail - don't interrupt user experience
      console.warn('Failed to track access:', error)
    }
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.toString().trim() === '') {
      setSelectedText('')
      setSelection(null)
      return
    }

    const text = selection.toString()
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()

    if (containerRect) {
      setSelectedText(text)
      setSelection({
        x: (rect.left - containerRect.left) / containerRect.width,
        y: (rect.top - containerRect.top) / containerRect.height
      })
    }
  }

  const handleAddComment = () => {
    if (!selectedText || !selection) return

    onCommentAdd({
      pageNumber,
      positionX: selection.x,
      positionY: selection.y,
      selectedText
    })

    // Clear selection
    window.getSelection()?.removeAllRanges()
    setSelectedText('')
    setSelection(null)
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset
      if (newPage < 1 || newPage > numPages) return prevPageNumber
      return newPage
    })
  }

  const handleZoom = (delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(3.0, prev + delta)))
    trackAccess('zoom', { scale: scale + delta })
  }

  const handleSearch = () => {
    if (!searchText) return
    // PDF.js search implementation would go here
    trackAccess('search', { query: searchText })
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="border-b bg-white p-2 flex items-center gap-2 flex-wrap">
        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">
            Page {pageNumber} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-l h-6 mx-2" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleZoom(-0.1)}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleZoom(0.1)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-l h-6 mx-2" />

        {/* Search */}
        <div className="flex items-center gap-1 flex-1 max-w-xs">
          <Input
            type="text"
            placeholder="Search in document..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-8"
          />
          <Button variant="ghost" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Comment button (shown when text selected) */}
        {selectedText && (
          <Button
            variant="default"
            size="sm"
            onClick={handleAddComment}
            className="ml-auto"
          >
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Add Comment
          </Button>
        )}
      </div>

      {/* PDF Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
        onMouseUp={handleTextSelection}
      >
        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex justify-center"
          >
            <div className="relative">
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={false}
              />

              {/* Overlay comments for current page */}
              {comments
                .filter(c => c.pageNumber === pageNumber)
                .map(comment => (
                  <CommentMarker
                    key={comment.id}
                    comment={comment}
                    scale={scale}
                  />
                ))}
            </div>
          </Document>
        )}
      </div>
    </div>
  )
}

// Comment marker component
function CommentMarker({ comment, scale }: { comment: Comment; scale: number }) {
  return (
    <div
      className="absolute w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-600 cursor-pointer hover:scale-110 transition-transform"
      style={{
        left: `${comment.positionX * 100}%`,
        top: `${comment.positionY * 100}%`,
        transform: `translate(-50%, -50%) scale(${1 / scale})`
      }}
      title={comment.commentText}
    >
      <span className="text-xs font-bold text-yellow-900 flex items-center justify-center h-full">
        !
      </span>
    </div>
  )
}
```

### 6.3 Security: Prevent Downloads

**Backend**: `packages/backend/src/controllers/paper.controller.ts`

```typescript
export const streamPaperContent = asyncHandler(async (req: Request, res: Response) => {
  const { paperId } = req.params
  const userId = req.user!.id

  // Verify reviewer has access
  const hasAccess = await PaperReviewerModel.hasAccess(paperId, userId)
  if (!hasAccess) {
    throw new AppError('Access denied', 403)
  }

  // Get paper storage key
  const paper = await PaperModel.findById(paperId)
  if (!paper) {
    throw new AppError('Paper not found', 404)
  }

  // Stream from storage (S3 or local)
  const stream = await PaperStorageService.getStream(paper.pdfStorageKey)

  // CRITICAL: Set headers to prevent download
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline') // NOT 'attachment'
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN') // Prevent embedding in external sites

  // Disable right-click via CSP (optional, can be bypassed but adds friction)
  res.setHeader('Content-Security-Policy', "default-src 'self'")

  stream.pipe(res)
})
```

**Frontend**: Additional protections in PDFViewer

```typescript
// Disable right-click context menu on PDF
useEffect(() => {
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    return false
  }

  const container = containerRef.current
  if (container) {
    container.addEventListener('contextmenu', handleContextMenu)
    return () => container.removeEventListener('contextmenu', handleContextMenu)
  }
}, [])

// Disable keyboard shortcuts (Ctrl+S, Ctrl+P)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
      e.preventDefault()
      return false
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

**Note**: These protections add friction but determined users can still extract content via:
- Browser DevTools (network tab)
- Print to PDF (can be blocked via print CSS)
- Screenshots (mitigated by screen recording feature)

The goal is to make casual downloading inconvenient, not impossible.

---

## 7. Screen & Camera Recording

### 7.1 Technology Choice

**Recommended**: [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) (native browser API)
- No external dependencies
- Cross-browser support (Chrome, Firefox, Safari 14+, Edge)
- Streams directly to backend
- WebM/VP9 codec (or H.264 on Safari)

**Alternative**: [RecordRTC](https://github.com/muaz-khan/RecordRTC) (wrapper with more features)

### 7.2 Recording Component

**File**: `packages/frontend-user/src/app/reviews/[reviewId]/components/RecordingControls.tsx`

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Video, VideoOff, Monitor, MonitorOff } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface RecordingControlsProps {
  paperId: string
  reviewId: string
}

export default function RecordingControls({ paperId, reviewId }: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [recordingType, setRecordingType] = useState<'screen' | 'camera' | 'both'>('screen')
  const [consent, setConsent] = useState({
    screen: false,
    camera: false,
    understood: false
  })
  const [recordingId, setRecordingId] = useState<string | null>(null)

  const screenRecorderRef = useRef<MediaRecorder | null>(null)
  const cameraRecorderRef = useRef<MediaRecorder | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Request recording permission
  const requestRecording = async (type: 'screen' | 'camera' | 'both') => {
    setRecordingType(type)
    setShowConsentDialog(true)
  }

  // Handle consent and start recording
  const handleConsentGranted = async () => {
    if (recordingType === 'both' && (!consent.screen || !consent.camera)) {
      alert('Please grant all required permissions')
      return
    }
    if (recordingType === 'screen' && !consent.screen) {
      alert('Please grant screen recording permission')
      return
    }
    if (recordingType === 'camera' && !consent.camera) {
      alert('Please grant camera recording permission')
      return
    }
    if (!consent.understood) {
      alert('Please confirm you understand the recording policy')
      return
    }

    try {
      // Create recording session in backend
      const response = await apiClient.post(`/papers/${paperId}/recordings/request`, {
        recordingType
      })
      const { recordingId: newRecordingId } = response.data

      // Grant consent
      await apiClient.post(`/recordings/${newRecordingId}/consent`, {
        consentGiven: true
      })

      setRecordingId(newRecordingId)
      setShowConsentDialog(false)

      // Start recording
      await startRecording(newRecordingId)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Failed to start recording. Please try again.')
    }
  }

  // Start media recording
  const startRecording = async (recId: string) => {
    try {
      // Request screen capture
      if (recordingType === 'screen' || recordingType === 'both') {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'browser' // Prefer browser tab over entire screen
          } as any,
          audio: false
        })
        screenStreamRef.current = screenStream

        const screenRecorder = new MediaRecorder(screenStream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 2500000 // 2.5 Mbps
        })

        screenRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data)
            // Upload chunk to backend
            uploadChunk(recId, event.data, 'screen')
          }
        }

        screenRecorder.onstop = () => {
          handleRecordingStop(recId)
        }

        screenRecorder.start(5000) // Capture in 5-second chunks
        screenRecorderRef.current = screenRecorder
      }

      // Request camera capture
      if (recordingType === 'camera' || recordingType === 'both') {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true
        })
        cameraStreamRef.current = cameraStream

        const cameraRecorder = new MediaRecorder(cameraStream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 1000000 // 1 Mbps
        })

        cameraRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            uploadChunk(recId, event.data, 'camera')
          }
        }

        cameraRecorder.start(5000)
        cameraRecorderRef.current = cameraRecorder
      }

      // Notify backend recording started
      await apiClient.post(`/recordings/${recId}/start`)
      setIsRecording(true)

    } catch (error) {
      console.error('Failed to start media capture:', error)
      alert('Failed to access screen/camera. Please grant permissions.')

      // Cleanup
      stopAllStreams()
      setRecordingId(null)
    }
  }

  // Upload recording chunk to backend
  const uploadChunk = async (recId: string, chunk: Blob, type: string) => {
    try {
      const formData = new FormData()
      formData.append('chunk', chunk, `${type}-${Date.now()}.webm`)
      formData.append('type', type)

      await apiClient.post(`/recordings/${recId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } catch (error) {
      console.error('Failed to upload chunk:', error)
    }
  }

  // Stop recording
  const stopRecording = async () => {
    if (!recordingId) return

    try {
      // Stop all recorders
      screenRecorderRef.current?.stop()
      cameraRecorderRef.current?.stop()
      stopAllStreams()

      // Notify backend
      await apiClient.post(`/recordings/${recordingId}/stop`)

      setIsRecording(false)
      setRecordingId(null)
      chunksRef.current = []
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }

  // Handle recording stop
  const handleRecordingStop = async (recId: string) => {
    stopAllStreams()
  }

  // Stop all media streams
  const stopAllStreams = () => {
    screenStreamRef.current?.getTracks().forEach(track => track.stop())
    cameraStreamRef.current?.getTracks().forEach(track => track.stop())
    screenStreamRef.current = null
    cameraStreamRef.current = null
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording()
      }
    }
  }, [])

  return (
    <>
      {/* Recording Controls */}
      <div className="flex gap-2">
        {!isRecording ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestRecording('screen')}
            >
              <Monitor className="h-4 w-4 mr-2" />
              Record Screen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestRecording('camera')}
            >
              <Video className="h-4 w-4 mr-2" />
              Record Camera
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestRecording('both')}
            >
              <Monitor className="h-4 w-4 mr-1" />
              <Video className="h-4 w-4 mr-2" />
              Both
            </Button>
          </>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="animate-pulse"
          >
            <MonitorOff className="h-4 w-4 mr-2" />
            Stop Recording
          </Button>
        )}
      </div>

      {/* Consent Dialog */}
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recording Consent</DialogTitle>
            <DialogDescription>
              Please review and accept the following terms before starting the recording.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <h4 className="font-medium mb-2">What will be recorded:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {(recordingType === 'screen' || recordingType === 'both') && (
                  <li>Your screen activity while reviewing this paper</li>
                )}
                {(recordingType === 'camera' || recordingType === 'both') && (
                  <li>Video from your camera</li>
                )}
                {(recordingType === 'camera' || recordingType === 'both') && (
                  <li>Audio from your microphone</li>
                )}
              </ul>
            </div>

            <div className="space-y-3">
              {(recordingType === 'screen' || recordingType === 'both') && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="screen-consent"
                    checked={consent.screen}
                    onCheckedChange={(checked) =>
                      setConsent(prev => ({ ...prev, screen: checked as boolean }))
                    }
                  />
                  <label htmlFor="screen-consent" className="text-sm cursor-pointer">
                    I consent to screen recording while reviewing this paper.
                    I understand the recording will capture my screen activity.
                  </label>
                </div>
              )}

              {(recordingType === 'camera' || recordingType === 'both') && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="camera-consent"
                    checked={consent.camera}
                    onCheckedChange={(checked) =>
                      setConsent(prev => ({ ...prev, camera: checked as boolean }))
                    }
                  />
                  <label htmlFor="camera-consent" className="text-sm cursor-pointer">
                    I consent to camera and audio recording while reviewing this paper.
                  </label>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Checkbox
                  id="understood"
                  checked={consent.understood}
                  onCheckedChange={(checked) =>
                    setConsent(prev => ({ ...prev, understood: checked as boolean }))
                  }
                />
                <label htmlFor="understood" className="text-sm cursor-pointer">
                  I understand that:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>The recording will be stored securely and only accessed by authorized administrators</li>
                    <li>The recording is used for quality assurance and research integrity purposes</li>
                    <li>I can stop the recording at any time</li>
                  </ul>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConsentGranted}>
              Accept and Start Recording
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### 7.3 Backend Recording Handler

**File**: `packages/backend/src/services/recording.service.ts`

```typescript
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs-extra'
import path from 'path'
import { pool } from '../config/database'
import { AppError } from '../middleware/error.middleware'

export class RecordingService {
  // Request recording session
  static async requestRecording(
    paperReviewerId: string,
    reviewId: string,
    reviewerId: string,
    paperId: string,
    recordingType: 'screen' | 'camera' | 'both'
  ) {
    const id = uuidv4()

    const query = `
      INSERT INTO review_recordings
      (id, paper_reviewer_id, review_id, reviewer_id, paper_id, recording_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `

    const result = await pool.query(query, [
      id, paperReviewerId, reviewId, reviewerId, paperId, recordingType
    ])

    return result.rows[0]
  }

  // Grant consent
  static async grantConsent(recordingId: string, reviewerId: string) {
    const query = `
      UPDATE review_recordings
      SET consent_given = true, consent_timestamp = NOW()
      WHERE id = $1 AND reviewer_id = $2
      RETURNING *
    `

    const result = await pool.query(query, [recordingId, reviewerId])

    if (result.rows.length === 0) {
      throw new AppError('Recording not found', 404)
    }

    return result.rows[0]
  }

  // Start recording
  static async startRecording(recordingId: string, reviewerId: string) {
    const query = `
      UPDATE review_recordings
      SET started_at = NOW(), status = 'recording'
      WHERE id = $1 AND reviewer_id = $2 AND consent_given = true
      RETURNING *
    `

    const result = await pool.query(query, [recordingId, reviewerId])

    if (result.rows.length === 0) {
      throw new AppError('Recording not found or consent not granted', 404)
    }

    return result.rows[0]
  }

  // Upload chunk
  static async uploadChunk(
    recordingId: string,
    reviewerId: string,
    chunk: Buffer,
    type: string,
    filename: string
  ) {
    // Verify recording exists and is active
    const checkQuery = `
      SELECT * FROM review_recordings
      WHERE id = $1 AND reviewer_id = $2 AND status = 'recording'
    `
    const checkResult = await pool.query(checkQuery, [recordingId, reviewerId])

    if (checkResult.rows.length === 0) {
      throw new AppError('Recording not active', 400)
    }

    // Store chunk to temporary location
    const uploadDir = path.join(process.env.UPLOAD_DIR || '/tmp/uploads', recordingId)
    await fs.ensureDir(uploadDir)

    const chunkPath = path.join(uploadDir, filename)
    await fs.writeFile(chunkPath, chunk)

    return { saved: true, path: chunkPath }
  }

  // Stop recording
  static async stopRecording(recordingId: string, reviewerId: string) {
    const query = `
      UPDATE review_recordings
      SET ended_at = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
          status = 'processing'
      WHERE id = $1 AND reviewer_id = $2 AND status = 'recording'
      RETURNING *
    `

    const result = await pool.query(query, [recordingId, reviewerId])

    if (result.rows.length === 0) {
      throw new AppError('Recording not found or not active', 404)
    }

    const recording = result.rows[0]

    // Merge chunks in background
    this.mergeChunksAsync(recordingId).catch(console.error)

    return recording
  }

  // Merge chunks (background job)
  private static async mergeChunksAsync(recordingId: string) {
    try {
      const uploadDir = path.join(process.env.UPLOAD_DIR || '/tmp/uploads', recordingId)
      const chunks = await fs.readdir(uploadDir)

      // Sort chunks by timestamp in filename
      chunks.sort()

      // Merge using ffmpeg (if available) or simple concatenation
      const outputPath = path.join(uploadDir, 'merged.webm')

      // Simple concatenation (works for WebM)
      const writeStream = fs.createWriteStream(outputPath)
      for (const chunk of chunks) {
        const chunkPath = path.join(uploadDir, chunk)
        const data = await fs.readFile(chunkPath)
        writeStream.write(data)
      }
      writeStream.end()

      // Upload to S3 or keep locally
      const storageKey = await this.uploadToStorage(outputPath, recordingId)

      // Update database
      const fileSize = (await fs.stat(outputPath)).size
      await pool.query(
        `UPDATE review_recordings
         SET storage_key = $1, file_size = $2, status = 'available'
         WHERE id = $3`,
        [storageKey, fileSize, recordingId]
      )

      // Cleanup temp files
      await fs.remove(uploadDir)

    } catch (error) {
      console.error('Failed to merge recording chunks:', error)
      await pool.query(
        `UPDATE review_recordings SET status = 'failed' WHERE id = $1`,
        [recordingId]
      )
    }
  }

  // Upload to storage (S3 or local)
  private static async uploadToStorage(filePath: string, recordingId: string): Promise<string> {
    // If using S3:
    // - Upload using AWS SDK
    // - Return S3 key

    // For now, return local path
    const storageDir = path.join(process.env.STORAGE_DIR || '/var/storage/recordings', recordingId)
    await fs.ensureDir(storageDir)
    const destPath = path.join(storageDir, 'recording.webm')
    await fs.move(filePath, destPath, { overwrite: true })
    return destPath
  }

  // Get recording metadata
  static async getRecording(recordingId: string, userId: string) {
    const query = `
      SELECT r.*, pr.paper_id, pr.reviewer_id
      FROM review_recordings r
      JOIN paper_reviewers pr ON r.paper_reviewer_id = pr.id
      WHERE r.id = $1 AND (pr.reviewer_id = $2 OR EXISTS (
        SELECT 1 FROM papers p WHERE p.id = pr.paper_id AND p.project_id IN (
          SELECT project_id FROM project_members WHERE user_id = $2
        )
      ))
    `

    const result = await pool.query(query, [recordingId, userId])

    if (result.rows.length === 0) {
      throw new AppError('Recording not found', 404)
    }

    return result.rows[0]
  }
}
```

---

## 8. Security & Permissions

### 8.1 Permission Model

```typescript
// Extend existing auth middleware
// File: packages/backend/src/middleware/review-auth.middleware.ts

import { Request, Response, NextFunction } from 'express'
import { AppError } from './error.middleware'
import { PaperReviewerModel } from '../models/paper-reviewer.model'

// Check if user is assigned reviewer for paper
export const requireReviewerAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { paperId, reviewId } = req.params
    const userId = req.user!.id

    let hasAccess = false

    if (paperId) {
      hasAccess = await PaperReviewerModel.hasAccess(paperId, userId)
    } else if (reviewId) {
      hasAccess = await PaperReviewerModel.hasAccessToReview(reviewId, userId)
    }

    if (!hasAccess) {
      throw new AppError('Access denied. You are not assigned as a reviewer.', 403)
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Check specific permission (view, write, AI)
export const requirePermission = (permission: 'canViewPaper' | 'canWriteReview' | 'canAccessAI') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paperId, reviewId } = req.params
      const userId = req.user!.id

      const permissions = await PaperReviewerModel.getPermissions(paperId || reviewId, userId)

      if (!permissions || !permissions[permission]) {
        throw new AppError(`Permission denied: ${permission}`, 403)
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

// Check if user is project admin (can manage reviewers)
export const requireProjectAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { paperId, projectId } = req.params
    const userId = req.user!.id

    // Get project from paper or directly
    let checkProjectId = projectId
    if (paperId) {
      const paper = await PaperModel.findById(paperId)
      checkProjectId = paper?.projectId
    }

    if (!checkProjectId) {
      throw new AppError('Project not found', 404)
    }

    const isAdmin = await ProjectModel.isAdmin(checkProjectId, userId)
    if (!isAdmin) {
      throw new AppError('Admin access required', 403)
    }

    next()
  } catch (error) {
    next(error)
  }
}
```

### 8.2 Rate Limiting

```typescript
// File: packages/backend/src/middleware/rate-limit.middleware.ts

import rateLimit from 'express-rate-limit'

// PDF streaming rate limit (prevent abuse)
export const pdfStreamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Max 50 requests per window per IP
  message: 'Too many PDF requests, please try again later.'
})

// Recording upload rate limit
export const recordingUploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Max 100 chunks per minute (reasonable for 5-second chunks)
  message: 'Recording upload rate exceeded.'
})

// AI query rate limit
export const aiQueryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Max 20 AI queries per minute
  message: 'Too many AI requests, please slow down.'
})
```

### 8.3 Data Privacy

```typescript
// Anonymization for review exports
export class ReviewExportService {
  static async exportReviews(paperId: string, includeIdentity: boolean) {
    const reviews = await ReviewModel.findByPaper(paperId)

    if (!includeIdentity) {
      // Anonymize reviewer data
      return reviews.map((review, index) => ({
        ...review,
        reviewerId: `reviewer-${index + 1}`,
        reviewerEmail: undefined,
        reviewerName: `Reviewer ${index + 1}`
      }))
    }

    return reviews
  }
}
```

---

## 9. Integration with Existing Systems

### 9.1 Leverage Existing Infrastructure

#### Reuse Document/Event Tracking Pattern
```typescript
// packages/backend/src/services/review.service.ts

import { DocumentService } from './document.service'

export class ReviewService {
  // Reviews follow same tracking pattern as documents
  static async trackReviewEvents(reviewId: string, events: Event[]) {
    // Reuse DocumentService pattern
    return DocumentService.trackEvents(reviewId, events, 'review_events')
  }

  static async getReviewStatistics(reviewId: string) {
    // Reuse analytics calculations
    return DocumentService.getStatistics(reviewId, 'review_events')
  }
}
```

#### Extend AI Session Pattern
```typescript
// packages/backend/src/services/review-ai.service.ts

import { AIService } from './ai.service'

export class ReviewAIService extends AIService {
  // Override to provide paper context
  static async chat(
    reviewId: string,
    sessionId: string,
    message: string,
    paperContext?: string,
    reviewContext?: string
  ) {
    // Inject paper and review context into system prompt
    const systemPrompt = `
      You are an AI assistant helping a reviewer analyze an academic paper.

      Paper context:
      ${paperContext || 'No specific paper section selected'}

      Current review draft:
      ${reviewContext || 'Review not started'}

      Provide helpful, accurate analysis to support careful human review.
      Focus on: fact-checking, logical consistency, citation accuracy, clarity.
    `

    return super.chat(reviewId, sessionId, message, { systemPrompt })
  }
}
```

### 9.2 Frontend State Management

Extend existing Zustand stores:

```typescript
// packages/frontend-user/src/stores/review.store.ts

import { create } from 'zustand'
import { apiClient } from '@/lib/api'

interface ReviewState {
  currentReview: Review | null
  currentPaper: Paper | null
  comments: Comment[]
  aiSession: AISession | null
  isRecording: boolean

  // Actions
  loadReview: (reviewId: string) => Promise<void>
  updateReview: (content: any) => Promise<void>
  addComment: (comment: Partial<Comment>) => Promise<void>
  sendAIMessage: (message: string) => Promise<void>
  startRecording: (type: RecordingType) => Promise<void>
  stopRecording: () => Promise<void>
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  currentReview: null,
  currentPaper: null,
  comments: [],
  aiSession: null,
  isRecording: false,

  loadReview: async (reviewId: string) => {
    const review = await apiClient.get(`/reviews/${reviewId}`)
    const paper = await apiClient.get(`/papers/${review.data.paperId}`)
    const comments = await apiClient.get(`/reviews/${reviewId}/comments`)

    set({
      currentReview: review.data,
      currentPaper: paper.data,
      comments: comments.data
    })
  },

  updateReview: async (content: any) => {
    const { currentReview } = get()
    if (!currentReview) return

    const updated = await apiClient.patch(`/reviews/${currentReview.id}`, {
      content
    })

    set({ currentReview: updated.data })
  },

  addComment: async (comment: Partial<Comment>) => {
    const { currentReview, comments } = get()
    if (!currentReview) return

    const newComment = await apiClient.post(
      `/reviews/${currentReview.id}/comments`,
      comment
    )

    set({ comments: [...comments, newComment.data] })
  },

  sendAIMessage: async (message: string) => {
    const { currentReview, aiSession } = get()
    if (!currentReview) return

    // Create session if not exists
    let sessionId = aiSession?.id
    if (!sessionId) {
      const session = await apiClient.post(
        `/reviews/${currentReview.id}/ai/sessions`,
        {}
      )
      sessionId = session.data.id
      set({ aiSession: session.data })
    }

    // Send message
    await apiClient.post(
      `/reviews/${currentReview.id}/ai/sessions/${sessionId}/messages`,
      { message }
    )
  },

  startRecording: async (type: RecordingType) => {
    const { currentPaper, currentReview } = get()
    if (!currentPaper || !currentReview) return

    await apiClient.post(`/papers/${currentPaper.id}/recordings/request`, {
      recordingType: type
    })

    set({ isRecording: true })
  },

  stopRecording: async () => {
    // Implementation
    set({ isRecording: false })
  }
}))
```

---

## 10. Implementation Phases

### Phase 1: Core Infrastructure (Weeks 1-2)
- [ ] Database schema migration (005-peer-review-schema.sql)
- [ ] Backend models (PaperModel, ReviewModel, PaperReviewerModel)
- [ ] Backend services (PaperService, ReviewService, ReviewerService)
- [ ] API routes (papers/*, reviews/*)
- [ ] Authentication middleware (review-auth.middleware.ts)
- [ ] Testing: Unit tests for services and models

### Phase 2: PDF Viewer (Week 3)
- [ ] PDF storage service (local or S3)
- [ ] PDF streaming endpoint with security headers
- [ ] Frontend PDFViewer component (react-pdf integration)
- [ ] Comment/annotation system (frontend + backend)
- [ ] Paper access logging
- [ ] Testing: PDF upload, streaming, annotations

### Phase 3: Review Editor (Week 4)
- [ ] Extend Lexical editor for reviews
- [ ] Review event tracking (reuse document tracking)
- [ ] Review state management (Zustand store)
- [ ] Auto-save functionality
- [ ] Review submission flow
- [ ] Testing: Editor tracking, auto-save, submission

### Phase 4: Review Workspace UI (Week 5)
- [ ] 3-panel layout component
- [ ] Resizable panels
- [ ] Review workspace page
- [ ] Reviewer dashboard (assigned papers)
- [ ] Admin panel (assign reviewers, view progress)
- [ ] Testing: E2E workflow tests

### Phase 5: AI Assistant for Reviews (Week 6)
- [ ] ReviewAIService (extend AIService)
- [ ] Review AI session/message tables
- [ ] AI panel component
- [ ] Context injection (paper + review excerpts)
- [ ] Streaming responses via WebSocket
- [ ] Testing: AI queries, context accuracy

### Phase 6: Recording Feature (Week 7)
- [ ] RecordingService backend
- [ ] RecordingControls component
- [ ] MediaRecorder API integration
- [ ] Consent dialog UI
- [ ] Chunk upload and merging
- [ ] Storage integration (S3 or local)
- [ ] Testing: Screen recording, camera recording, consent flow

### Phase 7: Analytics & Export (Week 8)
- [ ] Review analytics endpoints
- [ ] Paper reading analytics
- [ ] AI interaction analytics
- [ ] Admin analytics dashboard
- [ ] Export functionality (reviews, recordings)
- [ ] Testing: Analytics accuracy, export formats

### Phase 8: Polish & Deployment (Week 9-10)
- [ ] Security audit (SQL injection, XSS, CSRF)
- [ ] Performance optimization (query optimization, caching)
- [ ] UI/UX polish (loading states, error handling)
- [ ] Documentation (API docs, user guides)
- [ ] Deployment scripts
- [ ] Final testing (load testing, security testing)

---

## Appendix

### A. Key Design Decisions

1. **Why TimescaleDB for events?**
   - Already used in project for document_events
   - Excellent for time-series data (page views, keystrokes)
   - Automatic partitioning by time

2. **Why PDF.js over alternatives?**
   - No external dependencies
   - Native browser rendering
   - Best control over download prevention
   - Open source and well-maintained

3. **Why MediaRecorder API?**
   - Native browser support (no libraries)
   - Direct streaming to backend
   - Cross-browser compatibility
   - Low latency

4. **Why separate review_events table?**
   - Keeps review tracking isolated from document tracking
   - Allows different retention policies
   - Easier to query and analyze review-specific patterns

5. **Why extend existing AIService?**
   - Code reuse (session management, streaming)
   - Consistent patterns
   - Less maintenance overhead

### B. Requirements Confirmed

1. **Storage**: Local storage (not S3)
2. **Retention**: 24 hours for recordings (automatic cleanup)
3. **Anonymous Reviews**: Reviewers see each other's reviews but all are anonymous
4. **Review Rounds**: Single round only (no revision cycles)
5. **Blind Review**: Yes - author names hidden from reviewers
6. **Review Templates**: No structured templates
7. **Notification System**: No email notifications
8. **Admin Dashboard**: Standard metrics (reading time, completion status, AI usage)

### C. Security Checklist

- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF tokens for state-changing operations
- [ ] Rate limiting on all endpoints
- [ ] PDF download prevention (header enforcement)
- [ ] Recording consent verification
- [ ] Access control on all operations
- [ ] Audit logging for sensitive actions
- [ ] Encrypted storage for recordings
- [ ] HTTPS enforcement in production

### D. Performance Considerations

- [ ] Lazy loading of PDF pages
- [ ] Chunked recording uploads
- [ ] Debounced auto-save (editor)
- [ ] Query pagination for large datasets
- [ ] Database indexes on foreign keys
- [ ] Redis caching for paper metadata
- [ ] CDN for static assets
- [ ] WebSocket connection pooling

---

## Summary

This design document provides a comprehensive architecture for adding peer-review capabilities to Humanly. The feature integrates seamlessly with existing systems while adding:

1. **Secure PDF viewing** without download capability
2. **Full review provenance tracking** via existing event system
3. **AI-assisted review** to reduce LLM-induced errors
4. **Optional screen/camera recording** with explicit consent
5. **Comprehensive analytics** for review quality assessment

The design follows existing Humanly patterns (3-tier architecture, TimescaleDB for events, Lexical for editing) and leverages current infrastructure (auth, WebSocket, AI service) to minimize implementation complexity.

**Estimated Timeline**: 8-10 weeks for full implementation
**Team Size**: 2-3 developers (1 backend, 1 frontend, 1 full-stack)

**Next Steps**:
1. Review this document with team and stakeholders
2. Answer open questions in Appendix B
3. Create detailed task breakdown in project management tool
4. Begin Phase 1 implementation
