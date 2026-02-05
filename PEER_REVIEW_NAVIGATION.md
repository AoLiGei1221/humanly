# Peer Review System - Navigation Guide

## 🏠 Entry Points

### Homepage (/)
The main homepage now includes peer review system links:
- **Admin: Upload Papers** → `/admin/papers`
- **Reviewer Dashboard** → `/review/dashboard`

---

## 👨‍💼 Admin Flow

### 1. Admin Papers Dashboard (`/admin/papers`)
**Purpose**: Central hub for paper management

**Features**:
- Upload new papers button (top right)
- Quick action cards:
  - Upload Paper
  - View total papers count
  - Manage reviews
- Search papers by title, authors, or abstract
- Papers table showing:
  - Title
  - Authors
  - Status (pending_review, under_review, reviewed)
  - Upload date
  - Review deadline
  - Actions (View, Manage Reviewers)

**Navigation**:
- Click "Upload Paper" → `/admin/papers/upload`
- Click "Reviewers" on any paper → `/admin/papers/[paperId]/reviewers`

---

### 2. Upload Paper (`/admin/papers/upload`)
**Purpose**: Upload new papers for peer review

**Features**:
- PDF file upload (drag & drop or click)
  - Validates: PDF format, max 50MB
- Paper metadata form:
  - Project ID (required)
  - Title (required)
  - Authors (required, multi-entry)
  - Abstract (required)
  - Keywords (optional, multi-entry)
  - Review deadline (optional)
- Real-time validation
- Cancel or Upload actions

**After upload**: Redirects to `/admin/papers/[paperId]` (paper detail page)

---

### 3. Manage Reviewers (`/admin/papers/[paperId]/reviewers`)
**Purpose**: Assign and manage reviewers for a paper

**Features**:
- Paper title header
- Stats dashboard:
  - Total reviewers
  - Pending count
  - In progress count
  - Submitted count
- "Add Reviewer" button (opens dialog)
- Reviewers table showing:
  - Reviewer ID
  - Status (pending, in_progress, submitted)
  - Permissions (View, Write, AI)
  - Activity (papers opened, reading time)
  - Assigned date
  - Actions (Edit, Remove)

**Add Reviewer Dialog**:
- Reviewer ID input
- Permissions checkboxes:
  - ✅ Can view paper
  - ✅ Can write review
  - ✅ Can access AI assistant
- "Assign Reviewer" button

---

## 👨‍🔬 Reviewer Flow

### 1. Reviewer Dashboard (`/review/dashboard`)
**Purpose**: View all assigned review tasks

**Features**:
- Search papers
- Filter by status:
  - All
  - Pending
  - In Progress
  - Submitted
- Stats summary cards:
  - Total assignments
  - Pending
  - In Progress
  - Submitted
- Assignments list showing:
  - Paper ID (first 8 chars)
  - Status badge
  - Assignment date
  - Started/Submitted dates
  - Papers opened count
  - Reading time
  - Permissions badges
  - Deadline warning
  - "Start Review" or "View Review" button

**Navigation**:
- Click "Start Review" → `/review/[paperId]` (3-panel workspace)

---

### 2. Review Workspace (`/review/[paperId]`)
**Purpose**: 3-panel interface for reviewing papers

**Layout**: Three equal panels (1/3 width each)

#### Left Panel: PDF Viewer
- Page navigation (prev/next buttons)
- Page counter (Page X / Y)
- Zoom controls (zoom in/out, percentage display)
- Search in document
- PDF content with text layer
- Comment markers (yellow circles) on selected text
- Right-click disabled
- Ctrl+S and Ctrl+P disabled
- "Add Comment" button appears when text selected

#### Center Panel: Review Editor
- Header:
  - "Write Your Review" title
  - Word count / Character count
  - Minimum 50 words warning
  - "Save" button
  - "Submit Review" button
- Lexical rich text editor:
  - Full formatting toolbar
  - Headings, lists, text formatting
  - Real-time keystroke tracking
  - Auto-save every 30 seconds
- Footer stats:
  - Status (Draft/Submitted)
  - Started date
  - Submitted date (if submitted)

#### Right Panel: Comments & AI Assistant
**Tabs**:
1. **Comments Tab**:
   - "Your Comments" header with count
   - List of PDF annotations:
     - Page number
     - Selected text (yellow highlight)
     - Comment text
   - Empty state: "Select text in PDF to add comments"

2. **AI Assistant Tab**:
   - AI assistant icon
   - "AI Review Assistant" title
   - Description: fact-checking, improvements, questions
   - Placeholder: "This feature will be implemented in a future phase"

**Panel Controls** (Top right):
- Toggle left panel (PDF) visibility
- Toggle right panel (Assistant) visibility
- When hidden, remaining panels expand to fill space

---

## 🔄 Complete User Journeys

### Admin Journey: Upload → Assign → Monitor
```
1. Homepage (/)
   ↓ Click "Admin: Upload Papers"
2. Admin Papers Dashboard (/admin/papers)
   ↓ Click "Upload Paper"
3. Upload Paper (/admin/papers/upload)
   ↓ Fill form + upload PDF + submit
4. Paper uploaded (redirects to paper detail)
   ↓ Navigate to reviewers page
5. Manage Reviewers (/admin/papers/[paperId]/reviewers)
   ↓ Click "Add Reviewer"
6. Assign reviewer with permissions
   ↓ Reviewer assigned
7. Monitor reviewer activity (papers opened, reading time)
```

### Reviewer Journey: Receive → Read → Write → Submit
```
1. Homepage (/)
   ↓ Click "Reviewer Dashboard"
2. Reviewer Dashboard (/review/dashboard)
   ↓ View assigned papers
3. Click "Start Review" on a paper
4. Review Workspace (/review/[paperId])
   ↓ 3-panel interface opens
5. Read PDF (left panel)
   - Navigate pages
   - Zoom in/out
   - Search text
   - Select text → Add comments
6. Write Review (center panel)
   - Type in Lexical editor
   - All keystrokes tracked
   - Auto-save every 30s
   - Manual save available
7. Use AI Assistant (right panel)
   - Ask questions
   - Get suggestions
   - Fact-check claims
8. Submit Review
   ↓ Validation: minimum 50 words
9. Review submitted (can no longer edit)
```

---

## 🎯 Quick Access URLs

### Admin URLs
- `/admin/papers` - Papers dashboard
- `/admin/papers/upload` - Upload new paper
- `/admin/papers/[paperId]/reviewers` - Manage reviewers

### Reviewer URLs
- `/review/dashboard` - Review assignments
- `/review/[paperId]` - Review workspace (3-panel)

### API Endpoints (for reference)
- `POST /api/v1/projects/:projectId/papers` - Upload paper
- `GET /api/v1/papers/:paperId/content` - Stream PDF
- `POST /api/v1/papers/:paperId/reviewers` - Assign reviewer
- `POST /api/v1/papers/:paperId/reviews` - Create/get review
- `PATCH /api/v1/reviews/:reviewId` - Update review
- `POST /api/v1/reviews/:reviewId/submit` - Submit review
- `POST /api/v1/reviews/:reviewId/events` - Track keystrokes

---

## 📱 Responsive Design Notes

- Desktop (recommended): 3-panel layout works best at 1920px+ width
- Laptop (1440px): Panels can be collapsed for more space
- Tablet: Consider collapsing left/right panels by default
- Mobile: Sequential vertical layout (not yet implemented)

---

## 🔐 Security Features

### PDF Protection
- ✅ Streaming only (no download)
- ✅ Right-click disabled
- ✅ Ctrl+S (Save) disabled
- ✅ Ctrl+P (Print) disabled
- ✅ Content-Disposition: inline header
- ✅ X-Content-Type-Options: nosniff

### Review Integrity
- ✅ All keystrokes tracked
- ✅ Event timestamps
- ✅ Auto-save with timestamps
- ✅ Submission locks review
- ✅ Activity tracking (page views, reading time)

### Access Control
- ✅ Permission-based (canViewPaper, canWriteReview, canAccessAI)
- ✅ Blind review (authors hidden from reviewers)
- ✅ Anonymous reviews (reviewers see each other as "Reviewer 1", "Reviewer 2")
- ✅ Only owner can edit their review
- ✅ Only admin can assign/remove reviewers

---

## 🎨 UI Components Used

All components from `@/components/ui`:
- Button
- Card
- Input
- Label
- Textarea
- Badge
- Checkbox
- Dialog
- Table
- Tabs

Plus custom icons from `lucide-react`.
