const CURRENT_VERSION = '2.2';

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

  // 頁面切換
  const mainMenu = document.getElementById('main-menu');
  const saverPage = document.getElementById('saver-page');
  const musicPage = document.getElementById('music-page');
  const calcPage = document.getElementById('calc-page');
  const playerPage = document.getElementById('player-page');

  const showPage = (page) => {
    [mainMenu, saverPage, musicPage, calcPage, playerPage].forEach(p => p.style.display = 'none');
    page.style.display = 'flex';
  };

  document.getElementById('go-saver').onclick = () => showPage(saverPage);
  document.getElementById('go-music').onclick = () => showPage(musicPage);
  document.getElementById('go-calc').onclick = () => showPage(calcPage);
  document.querySelectorAll('.back-btn').forEach(btn => btn.onclick = () => showPage(mainMenu));
  document.getElementById('player-back-btn').onclick = () => {
    document.getElementById('yt-player-wrapper').innerHTML = ''; 
    showPage(musicPage);
  };

  // --- 全功能計算機邏輯 ---
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

  const inputDecimal = (dot) => {
    if (waitingForSecondOperand) {
      displayValue = '0.';
      waitingForSecondOperand = false;
      return;
    }
    if (!displayValue.includes(dot)) displayValue += dot;
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

  const resetCalc = () => {
    displayValue = '0';
    firstOperand = null;
    waitingForSecondOperand = false;
    operator = null;
  };

  document.querySelectorAll('.calc-btn').forEach(btn => {
    btn.onclick = () => {
      const { textContent: val, classList } = btn;
      if (classList.contains('operator')) handleOperator(val);
      else if (classList.contains('clear')) resetCalc();
      else if (classList.contains('equals')) { handleOperator(operator); operator = null; }
      else if (classList.contains('backspace')) {
        displayValue = displayValue.length > 1 ? displayValue.slice(0, -1) : '0';
      } else if (classList.contains('plus-minus')) {
        displayValue = (parseFloat(displayValue) * -1).toString();
      } else if (val === '.') inputDecimal(val);
      else inputDigit(val);
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
        ${item.note ? `<p style="font-size:11px; color:#666; margin:5px 0;">${item.note}</p>` : ''}
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
      const isYT = song.url.includes('youtube.com') || song.url.includes('youtu.be');
      div.innerHTML = `
        <span class="delete-item" data-type="music" data-index="${index}">刪除</span>
        <span style="font-weight:bold; font-size:13px;">${song.title}</span>
        <p style="font-size:11px; color:#666; margin:3px 0;">歌手: ${song.artist || '未知'}</p>
        <div class="music-controls">
          ${isYT ? `<button class="play-btn" data-url="${song.url}" data-title="${song.title}">PLAY</button>` : ''}
          <button class="go-btn" data-url="${song.url}">${isYT ? 'GO' : '前往網站'}</button>
        </div>
      `;
      musicList.appendChild(div);
    });
    bindMusicEvents();
    bindDeleteEvents();
  };

  const bindMusicEvents = () => {
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.onclick = () => {
        const url = btn.getAttribute('data-url');
        const title = btn.getAttribute('data-title');
        let videoId = '';
        if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
        else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
        
        if (videoId) {
          document.getElementById('player-title').textContent = title;
          // 套用標準 YouTube 嵌入格式
          const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
          document.getElementById('yt-player-wrapper').innerHTML = `
            <iframe width="320" height="180" src="${embedUrl}" title="YouTube video player" 
            frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          `;
          showPage(playerPage);
        }
      };
    });
    document.querySelectorAll('.go-btn').forEach(btn => {
      btn.onclick = () => window.open(btn.getAttribute('data-url'), '_blank');
    });
  };

  const bindDeleteEvents = () => {
    document.querySelectorAll('.delete-item').forEach(btn => {
      btn.onclick = async () => {
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
    const songData = { title: '音樂歌曲', artist: '未知歌手', url: url };
    const data = await chrome.storage.local.get(['opini_music']);
    const songs = data.opini_music || [];
    songs.unshift(songData);
    await chrome.storage.local.set({ opini_music: songs });
    musicUrlInput.value = '';
    updateMusicList();
  };

  updateSaverList();
  updateMusicList();
});
