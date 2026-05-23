document.addEventListener('DOMContentLoaded', async () => {
  const urlEl = document.getElementById('current-url');
  const nameInput = document.getElementById('custom-name');
  const noteInput = document.getElementById('note-input');
  const saveBtn = document.getElementById('save-btn');
  const savedList = document.getElementById('saved-list');
  const clearBtn = document.getElementById('clear-all');

  // 1. 獲取當前分頁資訊
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    urlEl.textContent = tab.url;
    nameInput.value = tab.title; // 預設使用網頁標題
  }

  // 2. 載入已儲存的清單
  const updateList = async () => {
    const data = await chrome.storage.local.get(['opini_links']);
    const links = data.opini_links || [];
    savedList.innerHTML = '';
    
    links.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'saved-item';
      div.innerHTML = `
        <span class="delete-item" data-index="${index}">刪除</span>
        <a href="${item.url}" target="_blank" title="${item.url}">${item.displayName || item.title}</a>
        ${item.note ? `<p class="saved-note">${item.note}</p>` : ''}
      `;
      savedList.appendChild(div);
    });

    // 綁定刪除事件
    document.querySelectorAll('.delete-item').forEach(btn => {
      btn.onclick = async (e) => {
        const idx = e.target.getAttribute('data-index');
        const currentData = await chrome.storage.local.get(['opini_links']);
        const currentLinks = currentData.opini_links || [];
        currentLinks.splice(idx, 1);
        await chrome.storage.local.set({ opini_links: currentLinks });
        updateList();
      };
    });
  };

  updateList();

  // 3. 儲存按鈕邏輯
  saveBtn.onclick = async () => {
    const newLink = {
      title: tab.title,
      displayName: nameInput.value.trim() || tab.title,
      url: tab.url,
      note: noteInput.value.trim(),
      timestamp: Date.now()
    };

    const data = await chrome.storage.local.get(['opini_links']);
    const links = data.opini_links || [];
    links.unshift(newLink); 
    
    await chrome.storage.local.set({ opini_links: links });
    noteInput.value = '';
    updateList();
  };

  // 4. 清除所有
  clearBtn.onclick = async () => {
    if (confirm('確定要清除所有儲存的網址嗎？')) {
      await chrome.storage.local.set({ opini_links: [] });
      updateList();
    }
  };
});
