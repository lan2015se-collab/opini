const CURRENT_VERSION = '2.3';

document.addEventListener('DOMContentLoaded', async () => {
  // --- 版本檢查系統 ---
  const checkVersion = async () => {
    try {
      const response = await fetch('https://api.github.com/repos/lan2015se-collab/opini/releases/latest');
      const data = await response.json();
      const latestVersion = data.tag_name.replace('v', '');
      if (parseFloat(latestVersion) > parseFloat(CURRENT_VERSION)) {
        document.getElementById('update-version-text').textContent = `有新版本可用 v${latestVersion}`;
        document.getElementById('update-overlay').style.display = 'flex';
      }
    } catch (e) { console.log('版本檢查失敗', e); }
  };
  checkVersion();

  // 監聽來自內容腳本 (YouTube 按鈕) 的訊息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'addToOpiniMusic') {
      saveMusic(request.title, request.url);
      sendResponse({ success: true });
    }
  });

  const saveMusic = async (title, url) => {
    const data = await chrome.storage.local.get(['opini_music']);
    const songs = data.opini_music || [];
    // 檢查是否重複
    if (!songs.some(s => s.url === url)) {
      songs.unshift({ title: title, url: url, artist: 'YouTube' });
      await chrome.storage.local.set({ opini_music: songs });
      if (musicPage.style.display !== 'none') updateMusicList();
    }
  };

  // 頁面切換
  const mainMenu = document.getElementById('main-menu');
  const saverPage = document.getElementById('saver-page');
  const musicPage = document.getElementById('music-page');
  const calcPage = document.getElementById('calc-page');

  const showPage = (page) => {
    [mainMenu, saverPage, musicPage, calcPage].forEach(p => p.style.display = 'none');
    page.style.display = 'flex';
  };

  document.getElementById('go-saver').onclick = () => showPage(saverPage);
  document.getElementById('go-music').onclick = () => { showPage(musicPage); updateMusicList(); };
  document.getElementById('go-calc').onclick = () => showPage(calcPage);
  document.querySelectorAll('.back-btn').forEach(btn => btn.onclick = () => showPage(mainMenu));

  // --- 計算機邏輯 ---
  const calcDisplay = document.getElementById('calc-display');
  let displayValue = '0';
  let firstOperand = null;
  let waitingForSecondOperand = false;
  let operator = null;

  const updateDisplay = () => { calcDisplay.value = displayValue; };

  const inputDigit = (digit) => {
    if (waitingForSecondOperand) {
      displayValue = digit;
      waitingForSecondOperand = false;
    } else {
      displayValue = displayValue === '0' ? digit : displayValue + digit;
    }
  };

  const handleOperator = (nextOperator) => {
    const inputValue = parseFloat(displayValue);
    if (operator && waitingForSecondOperand) {
      operator = nextOperator;
      return;
    }
    if (firstOperand === null && !isNaN(inputValue)) {
      firstOperand = inputValue;
    } else if (operator) {
      const result = calculate(firstOperand, inputValue, operator);
      displayValue = `${parseFloat(result.toFixed(7))}`;
      firstOperand = result;
    }
    waitingForSecondOperand = true;
    operator = nextOperator;
  };

  const calculate = (first, second, op) => {
    if (op === '+') return first + second;
    if (op === '-') return first - second;
    if (op === '*') return first * second;
    if (op === '/') return first / second;
    if (op === '%') return first % second;
    return second;
  };

  document.querySelectorAll('.calc-btn').forEach(btn => {
    btn.onclick = () => {
      const { textContent: val, classList } = btn;
      if (classList.contains('operator')) handleOperator(val);
      else if (classList.contains('clear')) { displayValue = '0'; firstOperand = null; operator = null; }
      else if (classList.contains('equals')) { handleOperator(operator); operator = null; }
      else if (classList.contains('backspace')) {
        displayValue = displayValue.length > 1 ? displayValue.slice(0, -1) : '0';
      } else if (classList.contains('plus-minus')) {
        displayValue = (parseFloat(displayValue) * -1).toString();
      } else if (val === '.') {
        if (!displayValue.includes('.')) displayValue += '.';
      } else inputDigit(val);
      updateDisplay();
    };
  });

  // --- 網址儲存邏輯 ---
  const urlEl = document.getElementById('current-url');
  const nameInput = document.getElementById('custom-name');
  const noteInput = document.getElementById('note-input');
  const saveBtn = document.getElementById('save-btn');
  const savedList = document.getElementById('saved-list');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) { urlEl.textContent = tab.url; nameInput.value = tab.title; }

  const updateSaverList = async () => {
    const data = await chrome.storage.local.get(['opini_links']);
    const links = data.opini_links || [];
    savedList.innerHTML = '';
    links.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'saved-item';
      div.innerHTML = `
        <span class="delete-item" data-type="saver" data-index="${index}">刪除</span>
        <a href="${item.url}" target="_blank">${item.displayName || item.title}</a>
        ${item.note ? `<p style="font-size:12px; color:#ccc; margin:5px 0;">${item.note}</p>` : ''}
      `;
      savedList.appendChild(div);
    });
    bindDeleteEvents();
  };

  saveBtn.onclick = async () => {
    const newLink = { title: tab.title, displayName: nameInput.value.trim() || tab.title, url: tab.url, note: noteInput.value.trim() };
    const data = await chrome.storage.local.get(['opini_links']);
    const links = data.opini_links || [];
    links.unshift(newLink);
    await chrome.storage.local.set({ opini_links: links });
    updateSaverList();
  };

  document.getElementById('clear-all').onclick = async () => {
    await chrome.storage.local.set({ opini_links: [] });
    updateSaverList();
  };

  // --- OpiniMusic 邏輯 ---
  const musicUrlInput = document.getElementById('music-url-input');
  const analyzeBtn = document.getElementById('analyze-save-btn');
  const musicList = document.getElementById('music-list');

  const updateMusicList = async () => {
    const data = await chrome.storage.local.get(['opini_music']);
    const songs = data.opini_music || [];
    musicList.innerHTML = '';
    songs.forEach((song, index) => {
      const div = document.createElement('div');
      div.className = 'music-item';
      div.innerHTML = `
        <span class="delete-item" data-type="music" data-index="${index}">刪除</span>
        <a href="${song.url}" target="_blank">${song.title}</a>
      `;
      musicList.appendChild(div);
    });
    bindDeleteEvents();
  };

  const bindDeleteEvents = () => {
    document.querySelectorAll('.delete-item').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-type');
        const idx = btn.getAttribute('data-index');
        const key = type === 'saver' ? 'opini_links' : 'opini_music';
        const data = await chrome.storage.local.get([key]);
        const list = data[key] || [];
        list.splice(idx, 1);
        await chrome.storage.local.set({ [key]: list });
        type === 'saver' ? updateSaverList() : updateMusicList();
      };
    });
  };

  analyzeBtn.onclick = async () => {
    const url = musicUrlInput.value.trim();
    if (!url) return;
    await saveMusic('手動新增歌曲', url);
    musicUrlInput.value = '';
    updateMusicList();
  };

  updateSaverList();
});
