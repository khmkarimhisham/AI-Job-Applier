document.addEventListener('DOMContentLoaded', () => {
  const openOptionsBtn = document.getElementById('openOptions');
  const autofillBtn = document.getElementById('autofillBtn');

  openOptionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  autofillBtn.addEventListener('click', () => {
    autofillBtn.innerText = '✨ Filling...';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) return;
      const tabId = tabs[0].id;

      chrome.tabs.sendMessage(tabId, { action: "triggerAutofill" }, (response) => {
        if (chrome.runtime.lastError) {
          // If the script isn't running (e.g. user didn't refresh), inject it!
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          }).then(() => {
            // After injection, send the message again
            chrome.tabs.sendMessage(tabId, { action: "triggerAutofill" }, (response) => {
              autofillBtn.innerText = '✨ Done!';
              setTimeout(() => window.close(), 1500);
            });
          }).catch(err => {
            console.error(err);
            autofillBtn.innerText = 'Error: Cannot run on this page';
          });
          return;
        }
        autofillBtn.innerText = '✨ Done!';
        setTimeout(() => window.close(), 1500);
      });
    });
  });
});
