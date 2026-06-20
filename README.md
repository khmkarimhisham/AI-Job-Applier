# AI Job Applier Extension

A browser extension that automates filling out job application forms using a local LLM (Ollama).

## Features
- **Automated Form Filling**: Scrapes job applications and fills them using your resume and customized Q&A context.
- **Local LLM Integration**: Uses Ollama running locally to process form fields and map your data without sending information to third-party APIs.
- **Configuration Dashboard**: An options page to handle file uploads (resume/Q&A) and local LLM settings.
- **Background Service Worker**: Handles LLM communication and bypasses cross-origin/CORS restrictions seamlessly.

## Installation (Unpacked Extension)
1. Clone this repository.
2. Open Chrome/Edge/Brave and go to `chrome://extensions/` (or `edge://extensions/`).
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the repository directory.

## Requirements
- [Ollama](https://ollama.com/) installed and running locally with your preferred model.
