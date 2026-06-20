if (typeof window.aiJobApplierLoaded === 'undefined') {
  window.aiJobApplierLoaded = true;

  console.log("AI Job Applier content script loaded");

let scrapedFieldsData = [];

function findLabelFor(input) {
  // 1. Check aria-labelledby
  const ariaLabelledBy = input.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const ids = ariaLabelledBy.split(' ');
    const labelTexts = ids.map(id => {
      const el = document.getElementById(id);
      return el ? el.innerText.trim() : '';
    }).filter(t => t);
    if (labelTexts.length > 0) return labelTexts.join(' ');
  }

  // 2. Check aria-label
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  // 3. Explicit label with "for"
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.innerText.trim();
  }
  
  // 4. Implicit label (wrapped)
  const parentLabel = input.closest('label');
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true);
    // Remove the input so we only get the label text
    const innerInputs = clone.querySelectorAll('input, textarea, select');
    innerInputs.forEach(i => i.remove());
    return clone.innerText.trim();
  }
  
  // 5. Look for a label tag or previous sibling within the closest form group container
  const container = input.closest('div, li, fieldset');
  if (container) {
    const label = container.querySelector('label');
    if (label) return label.innerText.trim();
    
    // Look for previous sibling that contains text (like a <h3> or <span>)
    let prev = input.previousElementSibling;
    while(prev) {
      const text = prev.innerText ? prev.innerText.trim() : '';
      if (text) return text;
      prev = prev.previousElementSibling;
    }
  }

  // 6. Fallback to placeholder or name/id
  let fallback = input.placeholder || input.name || input.id;
  if (fallback) {
    fallback = fallback.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    // Capitalize first letter
    return fallback.charAt(0).toUpperCase() + fallback.slice(1);
  }
  
  return "Unknown Field";
}

function scrapeFormFields() {
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
  const fields = [];
  
  inputs.forEach((input, index) => {
    // Skip elements that are visually hidden
    const rect = input.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Generate a unique ID if none exists to reliably map back
    const uniqueId = input.id || `ai_job_applier_field_${index}`;
    if (!input.id) input.id = uniqueId;

    const fieldData = {
      id: uniqueId,
      label: findLabelFor(input),
      type: input.tagName.toLowerCase() === 'input' ? input.type : input.tagName.toLowerCase()
    };

    if (fieldData.type === 'select') {
      fieldData.options = Array.from(input.options).map(opt => ({
        text: opt.text.trim(),
        value: opt.value.trim()
      })).filter(opt => opt.value);
    }

    fields.push(fieldData);
  });

  return fields;
}

async function fetchLLMCompletion(ollamaUrl, ollamaModel, contextText, learnedAnswers, fields) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({
        action: 'fetchLLM',
        payload: { ollamaUrl, ollamaModel, contextText, learnedAnswers, fields }
      }, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!response) {
          return reject(new Error("No response from background script. Ensure the extension is reloaded and Ollama is running."));
        }
        if (!response.success) {
          return reject(new Error(response.error || "Unknown error from background script."));
        }
        resolve(response.data);
      });
    } catch (e) {
      reject(new Error("Failed to send message: " + e.message));
    }
  });
}

function fillForm(filledData) {
  for (const [id, value] of Object.entries(filledData)) {
    const el = document.getElementById(id);
    if (!el) continue;

    if (value === 'UNKNOWN') {
      el.style.border = '2px solid orange';
      el.dataset.aiStatus = 'unknown';
    } else {
      el.value = value;
      el.style.border = '2px solid #10b981'; // Green to show AI filled it
      // Dispatch events to trigger any framework (React/Angular) state updates
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

function showLoadingIndicator() {
  if (document.getElementById('ai-job-applier-loading')) return;
  const loader = document.createElement('div');
  loader.id = 'ai-job-applier-loading';
  loader.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #2563eb;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  loader.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: ai-job-spin 1s linear infinite;">
      <line x1="12" y1="2" x2="12" y2="6"></line>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
      <line x1="2" y1="12" x2="6" y2="12"></line>
      <line x1="18" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
      <line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line>
    </svg>
    AI Job Applier is generating answers...
    <style>
      @keyframes ai-job-spin { 100% { transform: rotate(360deg); } }
    </style>
  `;
  document.body.appendChild(loader);
}

function hideLoadingIndicator() {
  const loader = document.getElementById('ai-job-applier-loading');
  if (loader) loader.remove();
}

async function triggerAutofill() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ollamaUrl', 'ollamaModel', 'userContextText', 'learnedAnswers'], async (result) => {
      if (!result.ollamaUrl || !result.ollamaModel || !result.userContextText) {
        alert("AI Job Applier: Please configure your settings (Ollama URL, Model, and Context) via the extension popup first.");
        return resolve();
      }

      scrapedFieldsData = scrapeFormFields();
      if (scrapedFieldsData.length === 0) {
        console.log("No form fields found.");
        return resolve();
      }

      try {
        showLoadingIndicator();
        const filledData = await fetchLLMCompletion(
          result.ollamaUrl,
          result.ollamaModel,
          result.userContextText, 
          result.learnedAnswers || {}, 
          scrapedFieldsData
        );
        fillForm(filledData);
      } catch (error) {
        console.error("AI Job Applier Error:", error);
        alert("AI Job Applier Error:\n" + (error.message || error));
      } finally {
        hideLoadingIndicator();
        resolve();
      }
    });
  });
}

// Listen for trigger from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "triggerAutofill") {
    triggerAutofill().then(() => {
      sendResponse({ status: "done" });
    }).catch(e => {
      sendResponse({ status: "error", message: e.message });
    });
    return true; // Keep message channel open for async response
  }
});

// The "Learn-as-You-Go" Feedback Loop
document.addEventListener('submit', (e) => {
  const unknownInputs = document.querySelectorAll('[data-ai-status="unknown"]');
  if (unknownInputs.length === 0) return;

  chrome.storage.local.get(['learnedAnswers'], (result) => {
    let learnedAnswers = result.learnedAnswers || {};
    let updated = false;

    unknownInputs.forEach(input => {
      const val = input.value.trim();
      if (val && val !== 'UNKNOWN') {
        const label = findLabelFor(input);
        // Save the manual answer using the label as the question context
        learnedAnswers[label] = val;
        updated = true;
      }
    });

    if (updated) {
      chrome.storage.local.set({ learnedAnswers }, () => {
        console.log("AI Job Applier: Learned new answers for future use:", learnedAnswers);
      });
    }
  });
});

// Listener replaces floating button
} // End of injection guard
