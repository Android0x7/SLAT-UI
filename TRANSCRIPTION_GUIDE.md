# Text Highlighter Feature - Usage Guide

## Overview

The Audio Recorder now includes a real-time text highlighter that synchronizes transcription text with audio playback. As you play a recording, words are highlighted in real-time showing:
- **Yellow highlight** - Currently playing word
- **Green highlight** - Already played words
- **No highlight** - Words not yet reached

## How to Use

### 1. Upload a Transcription File

After recording audio, you'll see an "Add Transcription" section below each recording with a file input field.

Click the file input and select a JSON file containing your transcription data.

### 2. Supported JSON Formats

The feature automatically normalizes three common transcription formats:

#### Format 1: WhisperX Format
```json
{
  "words": [
    {
      "word": "Hello",
      "start": 0.0,
      "end": 0.5,
      "confidence": 0.95
    },
    {
      "word": "world",
      "start": 0.6,
      "end": 1.2,
      "confidence": 0.98
    }
  ]
}
```

#### Format 2: Whisper Segment Format
```json
{
  "segments": [
    {
      "words": [
        {"word": "Hello", "start": 0.0, "end": 0.5},
        {"word": "world", "start": 0.6, "end": 1.2}
      ]
    }
  ]
}
```

#### Format 3: Simple Array
```json
[
  {"text": "Hello", "start": 0.0, "end": 0.5},
  {"text": "world", "start": 0.6, "end": 1.2}
]
```

Or wrapped in an object:
```json
{
  "words": [
    {"text": "Hello", "start": 0.0, "end": 0.5},
    {"text": "world", "start": 0.6, "end": 1.2}
  ]
}
```

### 3. Play and Watch the Highlighting

Once a transcription is loaded:
1. Click the Play button on the audio player
2. Words will be highlighted as they play
3. Currently playing word shows in yellow
4. Already played words show in green

## Generate Transcriptions

### Using WhisperX
```bash
whisperx your_audio.webm --model small --compute_type int8
```

This will generate a `your_audio.vtt` file. Convert to JSON:
```python
import json
# Parse the .vtt file and convert to JSON format
```

### Using OpenAI Whisper
```bash
python -m openai.whisper your_audio.webm --model small --output_format json
```

## Technical Details

- **Timestamp Precision**: Use seconds with decimals (e.g., 1.25 = 1 second 250ms)
- **Word Boundaries**: Should not overlap; ensure `word[i].end <= word[i+1].start`
- **Update Frequency**: Highlighting updates every 50ms for smooth synchronization
- **Format Flexibility**: The system auto-detects and normalizes your JSON structure

## Troubleshooting

**"Transcription loaded" message but no text appears:**
- Check that your JSON has valid word objects with `start` and `end` timestamps
- Ensure timestamps are numbers, not strings

**Words not highlighting correctly:**
- Verify the `start` and `end` timestamps match your audio duration
- Check for overlapping word timestamps

**"Error loading transcription" message:**
- Ensure the JSON file is valid (use jsonlint.com to validate)
- Check file encoding is UTF-8
- Verify the structure matches one of the supported formats

## Keyboard & Browser Support

- Works in modern browsers with Web Audio API support (Chrome, Firefox, Edge, Safari)
- Touch-friendly on mobile devices
- Highlighting continues smoothly during audio playback/pause/seek
