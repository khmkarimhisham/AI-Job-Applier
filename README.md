# AI Job Applier Extension

A browser extension that automates filling out job application forms using a local LLM (Ollama).

## ✨ Features

- **🧠 Local LLM Powered**: Uses your local Ollama models. Your personal data (resumes, context) never leaves your machine.
- **⚡ One-Click Autofill**: Automatically extracts fields from any job application form and fills them using your tailored context.
- **📁 File Management**: Upload `.txt` and `.md` files in the settings dashboard to provide rich context to the AI.
- **🔄 Learn-as-You-Go**: If the AI doesn't know an answer, it flags the field. When you manually fill it and submit the form, the extension learns your answer for next time!
- **⚛️ React/Vue Compatible**: Dispatches native DOM events so modern single-page applications register the autofilled data properly.

## 🚀 Prerequisites

1. **Google Chrome**, **Edge**, or **Brave** browser.
2. [Ollama](https://ollama.com/) installed and running locally.
3. At least one model downloaded in Ollama (e.g., `llama3`). 
   - *To download a model, open your terminal and run: `ollama run llama3`*

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/khmkarimhisham/AI-Job-Applier.git
   ```
2. **Load in Chrome:**
   - Open your browser and navigate to `chrome://extensions/`.
   - Enable **Developer mode** in the top right corner.
   - Click **Load unpacked** and select the `AI-Job-Applier` folder you just cloned.
3. **Pin the Extension:**
   - Click the puzzle piece icon in your Chrome toolbar and pin the AI Job Applier.

## ⚙️ Configuration & Usage

1. **Start Ollama:** Ensure Ollama is running (`ollama serve` or via the desktop app).
2. **Open Settings:** Click the extension icon in your toolbar and select **Open Settings**.
3. **Connect to Ollama:**
   - Verify the Host URL (default is `http://localhost:11434`).
   - Select your preferred model from the dropdown (e.g., `llama3:latest`).
4. **Add Context:**
   - Use the built-in file manager to upload or create `.txt`/`.md` files. Paste your resume, cover letter snippets, and common Q&A answers here.
   - Click **Save Settings**.
5. **Apply for Jobs!**
   - Go to any job application page.
   - Click the extension icon and hit **✨ Autofill Page**. Watch the magic happen!

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests. Ensure you follow the existing code style and test your changes on modern frameworks (React/Angular/Vue).

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
