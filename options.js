document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  const fileUpload = document.getElementById('fileUpload');
  const ollamaUrlInput = document.getElementById('ollamaUrl');
  const ollamaModelSelect = document.getElementById('ollamaModel');
  const refreshModelsBtn = document.getElementById('refreshModelsBtn');
  const statusArea = document.getElementById('statusArea');
  
  const fileListEl = document.getElementById('fileList');
  const addFileBtn = document.getElementById('addFileBtn');
  
  const editorContainer = document.getElementById('editorContainer');
  const editorEmptyState = document.getElementById('editorEmptyState');
  const editorContent = document.getElementById('editorContent');
  const filenameInput = document.getElementById('filenameInput');
  const fileEditor = document.getElementById('fileEditor');

  let userFiles = [];
  let activeFileId = null;

  function generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  function showStatus(msg, type = 'success') {
    statusArea.textContent = msg;
    statusArea.className = `status show ${type}`;
    setTimeout(() => {
      statusArea.classList.remove('show');
    }, 3000);
  }

  async function fetchModels(url) {
    if (!url) return;
    try {
      const response = await fetch(`${url.replace(/\/$/, '')}/api/tags`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      const currentSelection = ollamaModelSelect.value;
      ollamaModelSelect.innerHTML = '<option value="" disabled>Select a model</option>';
      
      if (data.models && data.models.length > 0) {
        data.models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.name;
          option.textContent = model.name;
          ollamaModelSelect.appendChild(option);
        });
        
        if (data.models.some(m => m.name === currentSelection)) {
          ollamaModelSelect.value = currentSelection;
        }
      } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No models found';
        option.disabled = true;
        ollamaModelSelect.appendChild(option);
      }
    } catch (e) {
      console.error('Error fetching models:', e);
      showStatus('Failed to fetch models from Ollama URL', 'error');
    }
  }

  refreshModelsBtn.addEventListener('click', () => {
    fetchModels(ollamaUrlInput.value.trim());
  });

  // Load existing data
  chrome.storage.local.get(['ollamaUrl', 'ollamaModel', 'userFiles', 'userContextText'], (result) => {
    if (result.ollamaUrl) {
      ollamaUrlInput.value = result.ollamaUrl;
      fetchModels(result.ollamaUrl).then(() => {
        if (result.ollamaModel) {
          ollamaModelSelect.value = result.ollamaModel;
        }
      });
    }

    if (result.userFiles) {
      userFiles = result.userFiles;
    } else if (result.userContextText) {
      // Migrate legacy context to a file
      userFiles = [{
        id: generateId(),
        name: 'legacy_context.txt',
        content: result.userContextText
      }];
    }

    renderFileList();
    if (userFiles.length > 0) {
      selectFile(userFiles[0].id);
    } else {
      showEmptyState();
    }
  });

  let dragStartIndex = null;

  function renderFileList() {
    fileListEl.innerHTML = '';
    userFiles.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = `file-item ${file.id === activeFileId ? 'active' : ''}`;
      li.onclick = () => selectFile(file.id);
      
      // Drag and Drop
      li.draggable = true;
      li.dataset.index = index;
      li.addEventListener('dragstart', function(e) {
        dragStartIndex = +this.dataset.index;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.index);
      });
      li.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
      });
      li.addEventListener('dragenter', function(e) {
        e.preventDefault();
        if (this !== document.querySelector('.dragging')) {
          this.classList.add('drag-over');
        }
      });
      li.addEventListener('dragleave', function(e) {
        this.classList.remove('drag-over');
      });
      li.addEventListener('drop', function(e) {
        e.stopPropagation();
        this.classList.remove('drag-over');
        const dragEndIndex = +this.dataset.index;
        if (dragStartIndex !== dragEndIndex && dragStartIndex !== null) {
          const itemToMove = userFiles.splice(dragStartIndex, 1)[0];
          userFiles.splice(dragEndIndex, 0, itemToMove);
          renderFileList();
        }
        return false;
      });
      li.addEventListener('dragend', function(e) {
        this.classList.remove('dragging');
        document.querySelectorAll('.file-item').forEach(item => item.classList.remove('drag-over'));
      });
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = file.name || 'Untitled';
      li.appendChild(nameSpan);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'file-actions';

      const renBtn = document.createElement('button');
      renBtn.className = 'icon-btn rename';
      renBtn.title = 'Rename';
      renBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
      renBtn.onclick = (e) => {
        e.stopPropagation();
        selectFile(file.id);
        filenameInput.focus();
      };
      actionsDiv.appendChild(renBtn);

      const dwnBtn = document.createElement('button');
      dwnBtn.className = 'icon-btn download';
      dwnBtn.title = 'Download';
      dwnBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
      dwnBtn.onclick = (e) => {
        e.stopPropagation();
        const blob = new Blob([file.content || ''], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name || 'export.txt';
        a.click();
        URL.revokeObjectURL(url);
      };
      actionsDiv.appendChild(dwnBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn delete';
      delBtn.title = 'Delete';
      delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        deleteFile(file.id);
      };
      
      actionsDiv.appendChild(delBtn);
      li.appendChild(actionsDiv);
      fileListEl.appendChild(li);
    });
  }

  function showEmptyState() {
    activeFileId = null;
    editorEmptyState.classList.remove('hidden');
    editorContent.classList.add('hidden');
    renderFileList();
  }

  function selectFile(id) {
    activeFileId = id;
    const file = userFiles.find(f => f.id === id);
    if (!file) {
      showEmptyState();
      return;
    }

    editorEmptyState.classList.add('hidden');
    editorContent.classList.remove('hidden');
    
    filenameInput.value = file.name;
    fileEditor.value = file.content;
    
    renderFileList();
  }

  function addNewFile() {
    const newFile = {
      id: generateId(),
      name: `untitled_${userFiles.length + 1}.txt`,
      content: ''
    };
    userFiles.push(newFile);
    selectFile(newFile.id);
  }

  function deleteFile(id) {
    userFiles = userFiles.filter(f => f.id !== id);
    if (activeFileId === id) {
      if (userFiles.length > 0) {
        selectFile(userFiles[0].id);
      } else {
        showEmptyState();
      }
    } else {
      renderFileList();
    }
  }

  // Event Listeners for Editor
  filenameInput.addEventListener('input', (e) => {
    if (!activeFileId) return;
    const file = userFiles.find(f => f.id === activeFileId);
    if (file) {
      file.name = e.target.value;
      renderFileList(); // Update sidebar name instantly
    }
  });

  fileEditor.addEventListener('input', (e) => {
    if (!activeFileId) return;
    const file = userFiles.find(f => f.id === activeFileId);
    if (file) {
      file.content = e.target.value;
    }
  });

  addFileBtn.addEventListener('click', addNewFile);

  // Handle File Uploads
  fileUpload.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let skippedFiles = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      const validExtensions = ['.txt', '.md'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        skippedFiles = true;
        continue;
      }

      try {
        const content = await readFileAsText(file);
        const newFile = {
          id: generateId(),
          name: file.name,
          content: content
        };
        userFiles.push(newFile);
      } catch (err) {
        console.error('Error reading file:', err);
        showStatus('Error reading file: ' + file.name, 'error');
      }
    }
    
    if (skippedFiles) {
      showStatus('Some files were skipped. Only .txt and .md are supported.', 'error');
    }

    // Reset input
    fileUpload.value = '';
    
    if (userFiles.length > 0) {
      selectFile(userFiles[userFiles.length - 1].id);
    } else {
      renderFileList();
    }
  });

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e);
      reader.readAsText(file);
    });
  }

  // Save Settings
  saveBtn.addEventListener('click', () => {
    const ollamaUrl = ollamaUrlInput.value.trim();
    if (!ollamaUrl) {
      showStatus('Please enter an Ollama Host URL.', 'error');
      return;
    }
    
    const ollamaModel = ollamaModelSelect.value;
    if (!ollamaModel) {
      showStatus('Please select an Ollama Model.', 'error');
      return;
    }

    // Combine all file contents for backwards compatibility with content.js
    const combinedText = userFiles.map(f => `${f.name}:\n${f.content}\n\n`).join('');

    const dataToSave = {
      ollamaUrl,
      ollamaModel,
      userFiles,
      userContextText: combinedText
    };

    // Initialize learnedAnswers if not present
    chrome.storage.local.get(['learnedAnswers'], (result) => {
      if (!result.learnedAnswers) {
        dataToSave.learnedAnswers = {};
      }
      
      chrome.storage.local.set(dataToSave, () => {
        showStatus('Settings and files saved successfully!');
      });
    });
  });
});
