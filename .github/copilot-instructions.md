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
  2. Recordings stored locally in `recordings[]` array with `{url, blob, timestamp, saved, transcription}` properties
  3. Upload only occurs on "Save All" button → batches unsaved recordings
- **Web Audio API**: Uses `MediaRecorder` with WebM MIME type
- **Text Highlighter**: Real-time word-by-word highlighting during audio playback
  - Supports JSON transcription uploads with word-level timestamps
  - Synchronizes highlight state (current/played) with audio playback position
  - Normalizes multiple transcription formats (WhisperX, Whisper, custom arrays)

## Critical Data Flows

### Recording & Upload Flow
1. User clicks "Record" → `startRecording()` streams audio to `mediaRecorder`
2. On "Stop", blob converted to object URL and pushed to `recordings[]`
3. "Save All" sends FormData to `POST /api/upload` with sessionId
4. Server saves to `uploads/{sessionId}/` and increments session counter
5. UI updates save status from "Pending" to "Saved" per recording

### Transcription & Highlighting Flow
1. User uploads JSON transcription file via file input on recording item
2. `loadTranscription()` parses JSON and normalizes to `{words: [{text, start, end}, ...]}` format
3. `renderTranscriptionWords()` creates span elements for each word with timing metadata
4. During audio playback:
   - `startHighlighting()` sets 50ms interval to check audio position
   - `updateHighlight()` compares current time to word start/end timestamps
   - Words get `.current` class (yellow highlight) if actively playing, `.played` class (green) if passed
5. Highlighting stops automatically when audio pauses via `stopHighlighting()`

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
- **Line 263-291**: `startRecording()` - getUserMedia + MediaRecorder setup, timer, and status management
- **Line 293-302**: `stopRecording()` - Teardown: stop recording, release audio track, update UI
- **Line 321-326**: `updateUI()` - Manages button disabled states based on recording/unsaved status
- **Line 366-407**: `saveAllRecordings()` - Loops through unsaved recordings, batches FormData uploads, updates UI per recording
- **Line 337-360**: `displayRecordings()` - Renders recordings list with audio controls, save status badges, delete buttons
- **Line 340, 354**: Save status badge pattern: conditional "✓ Saved" or "○ Pending" + styling classes
- **Transcription Features**:
  - `loadTranscription()` - Parses JSON transcription files and attaches to recording
  - `renderTranscriptionWords()` - Converts word array to interactive span elements
  - `updateHighlight()` - Synchronizes word highlighting with audio playback position
  - `startHighlighting()`/`stopHighlighting()` - Manages highlighting interval during play/pause

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
3. **Timestamp Filenaming**: ISO format with special chars stripped to avoid filesystem issues (`recording-${timestamp}` format)
4. **Client-side State Tracking**: `saved` flag on each recording tracks sync status between local & server
5. **Status Badges**: CSS classes like `.saved`, `.saving` control UI styling; "✓ Saved" vs "○ Pending" indicators
6. **UI State Management via updateUI()**: Single function gates button availability (Record/Stop/Save) based on `isRecording` and unsaved count
7. **Per-Recording Upload Loop**: `saveAllRecordings()` iterates unsaved recordings individually, allowing granular error handling and status updates per file
8. **Async/Await with Microphone Permissions**: UserMedia request wrapped in try-catch; graceful fallback if permission denied or API unavailable

## Integration Points

- **Frontend to Backend**: Fetch API (JSON for session init, FormData for audio uploads)
- **Transcription JSON Format**: Supports flexible word-level timestamp structure:
  - **WhisperX format**: `{words: [{word: "text", start: 0.5, end: 1.2, confidence: 0.95}, ...]}`
  - **Whisper segment format**: `{segments: [{words: [{word, start, end}, ...]}, ...]}`
  - **Simple array**: Direct array of words with `text/word`, `start`, `end` fields
  - See [sample-transcription.json](sample-transcription.json) for example structure
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

- **New Endpoints**: Follow REST pattern established in server.js (session scope in params or body); return JSON with `success` flag for API consistency
- **Frontend State**: Add properties to recording object, not separate arrays (keep single source of truth in `recordings[]`)
- **Button State Management**: Update `updateUI()` function to gate new buttons based on relevant state flags
- **File Organization**: Maintain `uploads/{sessionId}/` structure for batch export/cleanup; use consistent `recording-${timestamp}` naming
- **Error Handling**: Use `updateStatus()` for user-facing messages; include try-catch around UserMedia, fetch, and file I/O operations
- **Status Updates**: Follow pattern: update status message before operation, then on success/error; e.g., "Saving..." → "✓ Saved" or error message
- **UI Re-rendering**: Call `displayRecordings()` after state changes to keep list in sync with `recordings[]` array
- **Form Data Upload**: Always include `sessionId` in query string for `/api/upload`; use `encodeURIComponent()` for safety
