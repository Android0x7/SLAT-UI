# Copilot Instructions for Audio Recorder

## Project Overview
Audio Recorder is a full-stack web application for capturing, managing, and storing audio recordings. It uses Express.js backend with stateful session management and vanilla JavaScript frontend with Web Audio API.

## Architecture

### Backend (server.js)
- **Stack**: Express.js + Multer (file uploads) + UUID (session management)
- **Port**: 3000 (hardcoded)
- **Session Model**: In-memory object `sessions[sessionId]` tracks creation time and recording count
- **File Storage**: `uploads/{sessionId}/{recording-timestamp}.webm` structure
  - Sessions create directories on first upload via Multer's `destination` callback
  - Filenames use ISO timestamp with colons/dots stripped: `recording-2026-01-24T15-30-45-123Z.webm`

### Frontend (index.html)
- **Architecture**: Single HTML file with embedded CSS and JavaScript (no build step)
- **Session Flow**: 
  1. Page load triggers `initSession()` → `GET /api/session` → new UUID
  2. Recordings stored locally in `recordings[]` array with `{url, blob, timestamp, saved}` properties
  3. Upload only occurs on "Save All" button → batches unsaved recordings
- **Web Audio API**: Uses `MediaRecorder` with WebM MIME type

## Critical Data Flows

### Recording & Upload Flow
1. User clicks "Record" → `startRecording()` streams audio to `mediaRecorder`
2. On "Stop", blob converted to object URL and pushed to `recordings[]`
3. "Save All" sends FormData to `POST /api/upload` with sessionId
4. Server saves to `uploads/{sessionId}/` and increments session counter
5. UI updates save status from "Pending" to "Saved" per recording

### Session Lifecycle
- Frontend generates sessionId on load, backend creates session object
- No session cleanup/expiry implemented (lingering sessions in memory and on disk)
- `GET /api/sessions` lists all directories in uploads/ (bypasses in-memory session object)

## Key Files & Patterns

### [server.js](server.js)
- **Line 17-34**: Multer storage config with session directory creation
- **Line 45-52**: Session creation endpoint (generates UUID, tracks metadata)
- **Line 54-66**: Upload endpoint (increments recording counter)
- Routes intentionally minimal; no validation, no error handling for disk I/O

### [index.html](index.html)
- **Line 229-235**: `startRecording()` - getUserMedia + MediaRecorder setup
- **Line 243-256**: `saveAllRecordings()` - Batch upload with FormData, marking saved state
- **Line 259-279**: UI state management (disabled buttons, display recordings list)
- **Line 269**: Save status badge: conditional "✓ Saved" or "○ Pending"

## Developer Workflows

### Starting Development
```bash
npm install
npm start
# Server runs at http://localhost:3000 with live reload on code changes
```

### File Upload Testing
- Use browser DevTools Network tab to inspect FormData sent to `/api/upload`
- Check `uploads/{sessionId}/` to verify files saved with correct naming
- Session directories auto-created on first upload

### Browser Compatibility
- Requires Web Audio API (MediaRecorder, getUserMedia)
- Check added at bottom of script: `navigator.mediaDevices.getUserMedia` support check
- WebM format hardcoded; ensure target browsers support WebM codec

## Common Patterns & Conventions

1. **Session-scoped Storage**: All recordings tied to UUID-based session directory, not user accounts
2. **Lazy Directory Creation**: Multer creates `uploads/{sessionId}/` on first file upload, not on session creation
3. **Timestamp Filenaming**: ISO format with special chars stripped to avoid filesystem issues
4. **Client-side State Tracking**: `saved` flag on each recording tracks sync status between local & server
5. **Status Badges**: Classes like `.saved`, `.saving`, `.pending` control UI styling (see lines 186-198)

## Integration Points

- **Frontend to Backend**: Fetch API (JSON for session init, FormData for audio uploads)
- **External Dependencies**:
  - `express`: HTTP routing
  - `multer`: Multipart form data parsing (critical for audio blob handling)
  - `uuid`: SessionId generation (v4 cryptographically random)
  - `fs`: File system operations (no abstraction layer)
- **No Database**: All state is filesystem-based or in-memory; lost on server restart

## Known Limitations & Patterns to Preserve

- No session expiry; old sessions accumulate in `uploads/`
- No concurrent request validation (Multer handles disk writes atomically)
- HTML file served as static asset; any changes require server restart
- `mediaRecorder` codec defaults to browser's system audio codec (usually Opus in WebM container)
- No progress tracking for large uploads; FormData submission is blocking

## When Adding Features

- **New Endpoints**: Follow REST pattern established in server.js (session scope in params or body)
- **Frontend State**: Add properties to recording object, not separate arrays
- **File Organization**: Maintain `uploads/{sessionId}/` structure for batch export/cleanup
- **Error Handling**: Currently minimal; extend status messages in frontend for user feedback
