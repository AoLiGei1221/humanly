# Getting Started with Peer Review Feature

## ✅ Current Status

**Phase 1 (Backend) is COMPLETE and RUNNING!** 🎉

The backend server is running on **http://localhost:3001** with all 22 API endpoints ready.

## 🚀 What's Working Right Now

### Backend Infrastructure (100% Complete)
- ✅ Database: 9 tables with TimescaleDB for event tracking
- ✅ API: 22 endpoints for papers, reviews, and reviewers
- ✅ Storage: Local PDF storage in `./storage/papers`
- ✅ Security: Blind review + permission system
- ✅ Tracking: Event logging ready for provenance

### Dependencies Installed
```bash
✅ multer + @types/multer (file uploads)
✅ fs-extra + @types/fs-extra (file operations)
✅ uuid (already installed)
```

### Server Status
```
✅ Database connected
✅ Redis connected  
✅ WebSocket configured
✅ Server running on port 3001
```

## 📡 Available API Endpoints

### Upload & Manage Papers
- `POST /api/v1/projects/:projectId/papers` - Upload PDF with metadata
- `GET /api/v1/projects/:projectId/papers` - List papers
- `GET /api/v1/papers/:paperId` - Get paper (blind for reviewers)
- `GET /api/v1/papers/:paperId/content` - Stream PDF securely
- `PATCH /api/v1/papers/:paperId` - Update metadata
- `DELETE /api/v1/papers/:paperId` - Delete paper

### Assign Reviewers
- `POST /api/v1/papers/:paperId/reviewers` - Assign reviewer
- `GET /api/v1/papers/:paperId/reviewers` - List reviewers
- `PATCH /api/v1/papers/:paperId/reviewers/:reviewerId` - Update permissions
- `DELETE /api/v1/papers/:paperId/reviewers/:reviewerId` - Remove reviewer
- `GET /api/v1/reviewers/me/papers` - Get my assigned papers

### Write & Submit Reviews
- `POST /api/v1/papers/:paperId/reviews` - Create review (auto-create)
- `GET /api/v1/reviews/:reviewId` - Get review
- `PATCH /api/v1/reviews/:reviewId` - Update review content
- `POST /api/v1/reviews/:reviewId/submit` - Submit review
- `POST /api/v1/reviews/:reviewId/events` - Track keystrokes
- `GET /api/v1/reviews/:reviewId/stats` - Get statistics
- `GET /api/v1/papers/:paperId/reviews` - Get anonymous reviews (admin)

### Add Comments/Annotations
- `POST /api/v1/reviews/:reviewId/comments` - Add PDF annotation
- `GET /api/v1/reviews/:reviewId/comments` - Get comments
- `PATCH /api/v1/comments/:commentId` - Update comment
- `DELETE /api/v1/comments/:commentId` - Delete comment

## 🧪 Testing the API

### 1. Health Check
```bash
curl http://localhost:3001/health
```

### 2. Get Auth Token
You'll need to authenticate through the existing auth system first:
```bash
# Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Upload a Paper
```bash
curl -X POST http://localhost:3001/api/v1/projects/YOUR_PROJECT_ID/papers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@path/to/paper.pdf" \
  -F "title=Novel ML Approach" \
  -F 'authors=["Dr. Alice Smith","Dr. Bob Jones"]' \
  -F "abstract=We propose a novel approach..." \
  -F 'keywords=["machine learning","peer review"]'
```

### 4. Assign a Reviewer
```bash
curl -X POST http://localhost:3001/api/v1/papers/PAPER_ID/reviewers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewerId": "REVIEWER_USER_ID",
    "permissions": {
      "canViewPaper": true,
      "canWriteReview": true,
      "canAccessAI": true
    }
  }'
```

### 5. Get My Assigned Papers (as Reviewer)
```bash
curl http://localhost:3001/api/v1/reviewers/me/papers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎯 Next Steps: Build the Frontend

The backend is ready! Now you need to build the React UI:

### Phase 2: PDF Viewer
1. Install `react-pdf` in frontend-user package
2. Create PDFViewer component (code in PEER_REVIEW_DESIGN.md section 6.2)
3. Add annotation UI for comments
4. Test PDF streaming from backend

### Phase 3: Review Workspace
1. Create 3-panel layout (PDF | Editor | AI Assistant)
2. Integrate existing Lexical editor for review writing
3. Add review submission form
4. Build reviewer dashboard to list assigned papers

### Phase 4: Admin Interface
1. Paper upload page with drag-and-drop
2. Reviewer assignment UI
3. View anonymous reviews (as admin)

## 📚 Documentation

- **[PEER_REVIEW_DESIGN.md](PEER_REVIEW_DESIGN.md)** - Complete system design (2200+ lines)
  - Section 4: All API endpoint specifications
  - Section 5: Frontend architecture
  - Section 6: PDF Viewer implementation (full React code)
  - Section 7: Recording feature (screen/camera)

- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Progress tracker

## 🔧 Troubleshooting

### Backend won't start?
```bash
# Check if port 3001 is in use
lsof -i:3001

# Kill process and restart
kill -9 $(lsof -t -i:3001)
npm run dev --workspace=@humory/backend
```

### Missing dependencies?
```bash
# Install if needed
npm install multer @types/multer --workspace=@humory/backend
npm install fs-extra @types/fs-extra --workspace=@humory/backend
```

### TypeScript errors?
```bash
# Rebuild shared types
npm run build --workspace=@humory/shared
```

## 📂 File Structure

```
packages/
├── shared/src/types/
│   └── review.types.ts ✅ (All TypeScript interfaces)
│
├── backend/
│   ├── src/
│   │   ├── db/migrations/
│   │   │   └── 005-peer-review-schema.sql ✅
│   │   ├── models/                    ✅ (4 files)
│   │   ├── services/                  ✅ (4 files)
│   │   ├── controllers/               ✅ (2 files)
│   │   ├── routes/                    ✅ (2 files)
│   │   ├── middleware/
│   │   │   └── review-auth.middleware.ts ✅
│   │   └── app.ts (updated) ✅
│   │
│   └── storage/
│       ├── papers/   ✅ (PDF storage)
│       └── recordings/ ✅ (24h retention)
│
└── frontend-user/src/app/
    └── reviews/  ⏳ (TODO: Build React UI)
```

## 💡 Key Features

1. **Blind Review**: Author names automatically hidden from reviewers
2. **Anonymous Reviews**: Reviewers see each other as "Reviewer 1", "Reviewer 2"  
3. **No Downloads**: PDFs stream only (Content-Disposition: inline)
4. **Permissions**: Granular control (view, write, AI access) per reviewer
5. **Event Tracking**: TimescaleDB hypertables track every keystroke
6. **Local Storage**: All files in `./storage/` (no cloud dependencies)
7. **24h Retention**: Recordings auto-delete after 24 hours (DB trigger)

## 🎉 Summary

**You have a production-ready peer review backend!**

- ✅ 22 API endpoints tested and working
- ✅ Blind review enforced at database level
- ✅ PDF streaming with security headers
- ✅ Event tracking infrastructure ready
- ✅ Permission system fully implemented

**Next**: Copy the React components from PEER_REVIEW_DESIGN.md and start building the UI!

---

Need help? Check the design document for complete code examples of every component.
