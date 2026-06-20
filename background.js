chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchLLM') {
    const { ollamaUrl, ollamaModel, contextText, learnedAnswers, fields } = request.payload;
    
    const prompt = `
You are a precise and strictly logical Job Application Assistant.
Your task is to fill out a job application form using ONLY the user's provided context.

USER CONTEXT:
---
${contextText}
---

LEARNED ANSWERS (Use these if they match the question):
${JSON.stringify(learnedAnswers, null, 2)}

FORM FIELDS TO FILL:
${JSON.stringify(fields, null, 2)}

RULES:
1. Return a JSON object where keys are the field "id" and values are your answers.
2. For each field, read its "label" to understand exactly what is being asked.
3. Extract the exact answer from the USER CONTEXT or LEARNED ANSWERS.
4. If the question asks for a specific number (like salary, package, or years of experience), output ONLY the number (e.g. "5" or "100000").
5. If the answer is NOT explicitly stated in the context, you MUST set the value to the exact string "UNKNOWN". Do NOT guess, assume, or hallucinate.
6. Do NOT copy-paste large paragraphs unless the field specifically asks for a "Summary" or "Cover Letter".
7. Be extremely concise.
    `;

    fetch(`${ollamaUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: 'system', content: 'You are a helpful assistant designed to output only valid JSON. Do not include markdown formatting or explanations.' },
          { role: 'user', content: prompt }
        ],
        format: 'json',
        stream: false,
        options: {
          temperature: 0.2
        }
      })
    })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${text || 'No error details provided by Ollama. Check if the prompt exceeded the context window limit.'}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data || !data.message || !data.message.content) {
        throw new Error("Invalid response structure from Ollama: " + JSON.stringify(data));
      }
      
      let parsedData;
      try {
        parsedData = JSON.parse(data.message.content);
      } catch (e) {
        // Fallback for LLMs that still include markdown blocks despite format: json
        const match = data.message.content.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (match) {
          try {
            parsedData = JSON.parse(match[1]);
          } catch (innerE) {
            throw new Error("Failed to parse extracted JSON block.");
          }
        } else {
          throw new Error("Failed to parse JSON from Ollama. Output was: " + data.message.content);
        }
      }
      sendResponse({ success: true, data: parsedData });
    })
    .catch(error => {
      console.error("Ollama fetch error:", error);
      sendResponse({ success: false, error: error.message || String(error) });
    });

    return true; // Indicates we will send a response asynchronously
  }
});
