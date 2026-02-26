const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Create Learner directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'Learner');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files
app.use(express.static(__dirname));

// Session storage
const sessions = {};

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sessionId = req.query.sessionId || req.body.sessionId;
        
        if (!sessionId) {
            return cb(new Error('Session ID is required'));
        }
        
        const sessionDir = path.join(uploadsDir, sessionId);
        
        // Create session directory if it doesn't exist
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        
        cb(null, sessionDir);
    },
    filename: (req, file, cb) => {
        // Use the provided filename from FormData or generate timestamp-based name
        const originalName = file.originalname || `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        cb(null, originalName);
    }
});

const upload = multer({ storage });

// Create a new session
app.get('/api/session', (req, res) => {
    const sessionId = uuidv4();
    sessions[sessionId] = {
        createdAt: new Date(),
        recordingCount: 0
    };
    res.json({ sessionId });
});

// Upload audio recording
app.post('/api/upload', upload.single('audio'), (req, res) => {
    const sessionId = req.query.sessionId;
    
    if (sessions[sessionId]) {
        sessions[sessionId].recordingCount++;
    }
    
    res.json({
        success: true,
        message: 'Recording saved successfully',
        filename: req.file.filename,
        path: req.file.path
    });
});

// Get session info
app.get('/api/session/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    const sessionDir = path.join(uploadsDir, sessionId);
    
    if (fs.existsSync(sessionDir)) {
        const files = fs.readdirSync(sessionDir);
        res.json({
            sessionId,
            recordingCount: files.length,
            recordings: files,
            createdAt: sessions[sessionId]?.createdAt || 'Unknown'
        });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

// Save transcription
app.post('/api/save-transcription', (req, res) => {
    const { sessionId, transcriptionFileName, transcriptionData } = req.body;
    
    if (!sessionId || !transcriptionFileName || !transcriptionData) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const sessionDir = path.join(uploadsDir, sessionId);
        
        // Create session directory if it doesn't exist
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        
        // Extract filename only (no path)
        const fileName = path.basename(transcriptionFileName);
        const transcriptionPath = path.join(sessionDir, fileName);
        
        // Save transcription JSON
        fs.writeFileSync(transcriptionPath, JSON.stringify(transcriptionData, null, 2));
        
        res.json({
            success: true,
            message: 'Transcription saved successfully',
            filename: fileName,
            path: transcriptionPath
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save transcription: ' + error.message });
    }
});

// List all sessions
app.get('/api/sessions', (req, res) => {
    const sessions_data = [];
    const files = fs.readdirSync(uploadsDir);
    
    files.forEach(sessionId => {
        const sessionPath = path.join(uploadsDir, sessionId);
        if (fs.statSync(sessionPath).isDirectory()) {
            const recordings = fs.readdirSync(sessionPath);
            sessions_data.push({
                sessionId,
                recordingCount: recordings.length
            });
        }
    });
    
    res.json(sessions_data);
});

app.listen(PORT, () => {
    console.log(`Audio Recorder server running at http://localhost:${PORT}`);
    console.log(`Recordings will be saved to: ${uploadsDir}`);
});
