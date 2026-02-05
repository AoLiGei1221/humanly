# Peer Review System - User Flow

## 🎯 Simplified User Journey

### For Users (After Login)

```
Step 1: Access Peer Review System
URL: /review
Action: Click "Upload PDF" button

↓

Step 2: Upload Paper
URL: /admin/papers/upload
Action:
- Upload PDF file (drag & drop or browse)
- Fill in metadata (title, authors, abstract)
- Click "Upload Paper"

↓

Step 3: Assign Reviewers (Optional)
URL: /admin/papers/[paperId]/reviewers
Action: Click "Add Reviewer" and assign with permissions

↓

Step 4: Start Reviewing (as Reviewer)
URL: /review/dashboard
Action: Click "Start Review" on assigned paper

↓

Step 5: 3-Panel Review Workspace
URL: /review/[paperId]
Layout:
┌─────────────┬─────────────┬─────────────┐
│ PDF Viewer  │   Editor    │  Comments   │
│   (1/3)     │   (1/3)     │   (1/3)     │
└─────────────┴─────────────┴─────────────┘
```

## 📍 Entry Points

### Main Entry Point: `/review`
- **Purpose**: Landing page for peer review system
- **Two Options**:
  1. **Upload PDF** → Goes to upload form
  2. **My Reviews** → Goes to reviewer dashboard

### Not on Main Homepage
The peer review system is **separate** from the main Humanly homepage (`/`).
Users access it by navigating to `/review` after login.

## 🔄 Complete Flows

### Flow 1: Upload and Review Flow (Single User)

```
1. Navigate to /review
   ↓
2. Click "Upload PDF"
   ↓
3. Upload paper at /admin/papers/upload
   - Drag & drop PDF
   - Enter title, authors, abstract
   - Submit
   ↓
4. Redirected to /admin/papers/[paperId]/reviewers
   - Assign yourself or others as reviewers
   ↓
5. Go to /review/dashboard
   - See your assigned paper
   ↓
6. Click "Start Review"
   ↓
7. 3-Panel Workspace opens at /review/[paperId]
   - Read PDF (left)
   - Write review (center)
   - Add comments (right)
   ↓
8. Submit review
```

### Flow 2: Multi-User Flow (Admin + Reviewers)

**Admin Actions:**
```
1. Navigate to /review
2. Click "Upload PDF"
3. Upload paper with metadata
4. Assign multiple reviewers with permissions
5. Monitor review progress
```

**Reviewer Actions:**
```
1. Navigate to /review
2. Click "My Reviews"
3. See assigned papers in dashboard
4. Click "Start Review" on a paper
5. Use 3-panel workspace to review
6. Submit review
```

## 🎨 UI Structure

### `/review` - Landing Page
```
┌──────────────────────────────────────┐
│    Peer Review System Header         │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────┐      ┌──────────┐    │
│  │  Upload  │      │    My    │    │
│  │   PDF    │      │  Reviews │    │
│  │  [Card]  │      │  [Card]  │    │
│  └──────────┘      └──────────┘    │
│                                      │
│  Platform Features (3 cards)        │
└──────────────────────────────────────┘
```

### `/admin/papers/upload` - Upload Form
```
┌──────────────────────────────────────┐
│   Upload Paper for Review Header     │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐ │
│  │  PDF Upload Area               │ │
│  │  (Drag & drop or browse)       │ │
│  └────────────────────────────────┘ │
│                                      │
│  Paper Information Form:             │
│  - Project ID                        │
│  - Title                             │
│  - Authors (multi-entry)             │
│  - Abstract                          │
│  - Keywords (optional)               │
│  - Review Deadline (optional)        │
│                                      │
│  [Cancel]            [Upload Paper]  │
└──────────────────────────────────────┘
```

### `/review/[paperId]` - 3-Panel Workspace
```
┌────────────────────────────────────────────────────────┐
│  Peer Review Workspace    [Toggle Panels] [Toggle AI]  │
├──────────────┬──────────────┬──────────────────────────┤
│              │              │                          │
│  PDF Viewer  │    Editor    │   Comments & AI         │
│              │              │                          │
│  • Page nav  │  • Word cnt  │  Tabs:                  │
│  • Zoom      │  • Save      │  [Comments] [AI]        │
│  • Search    │  • Submit    │                          │
│  • Comments  │  • Tracking  │  • View comments        │
│              │              │  • AI assistant         │
│              │              │                          │
│  [No         │  [Lexical    │  [Comment list or      │
│   download!] │   editor]    │   AI chat]             │
│              │              │                          │
└──────────────┴──────────────┴──────────────────────────┘
```

## 🚀 Quick URLs

- `/review` - **START HERE** (Landing page)
- `/admin/papers/upload` - Upload PDF form
- `/review/dashboard` - Reviewer assignments
- `/review/[paperId]` - 3-panel workspace

## ⚠️ What Changed

**Before (Confusing):**
- Peer review links on main homepage (/)
- Mixed with Humanly login/register

**After (Clear):**
- Main homepage (/) is for Humanly system only
- Peer review has dedicated entry at `/review`
- Separate, focused workflow

## 📝 Notes

1. The 3-panel workspace is **always** 3 panels (left/center/right)
2. Panels can be toggled visible/hidden but workspace maintains 3-column structure
3. Upload button is prominent on landing page
4. No confusion with main Humanly system
