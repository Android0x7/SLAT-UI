const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

const INSTRUCTOR_FOLDER = path.join(__dirname, 'Instructor');
const TRANSCRIPTION_API = 'http://127.0.0.1:8080/v2/transcribe';

async function transcribeFile(filePath, fileName) {
    try {
        const audioStream = fs.createReadStream(filePath);
        const form = new FormData();
        form.append('audio', audioStream, fileName);

        console.log(`Transcribing ${fileName}...`);
        const response = await fetch(TRANSCRIPTION_API, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
        }

        const transcriptionData = await response.json();
        
        // Extract question number from filename (Q1.mp3 -> 1)
        const questionNum = fileName.replace('Q', '').replace('.mp3', '');
        const transcriptionFileName = `Q${questionNum}-transcription.json`;
        const transcriptionPath = path.join(INSTRUCTOR_FOLDER, transcriptionFileName);

        // Save transcription
        fs.writeFileSync(transcriptionPath, JSON.stringify(transcriptionData, null, 2));
        console.log(`✓ Saved: ${transcriptionFileName}`);
        
        return true;
    } catch (error) {
        console.error(`✗ Error transcribing ${fileName}:`, error.message);
        return false;
    }
}

async function main() {
    console.log('Starting transcription of Instructor files...\n');

    try {
        const files = fs.readdirSync(INSTRUCTOR_FOLDER)
            .filter(file => file.endsWith('.mp3'))
            .sort((a, b) => {
                const numA = parseInt(a.replace('Q', '').replace('.mp3', ''));
                const numB = parseInt(b.replace('Q', '').replace('.mp3', ''));
                return numA - numB;
            });

        console.log(`Found ${files.length} audio files to transcribe\n`);

        let completed = 0;
        for (const file of files) {
            const filePath = path.join(INSTRUCTOR_FOLDER, file);
            const success = await transcribeFile(filePath, file);
            if (success) completed++;
            
            // Add a small delay between requests to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`\n========================================`);
        console.log(`Transcription Complete!`);
        console.log(`Successfully transcribed: ${completed}/${files.length}`);
        console.log(`========================================`);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
