document.addEventListener('DOMContentLoaded', async () => {
  const authPage = document.getElementById('auth-page');
  const mainMenu = document.getElementById('main-menu');
  const saverPage = document.getElementById('saver-page');
  const musicPage = document.getElementById('music-page');
  const calcPage = document.getElementById('calc-page');
  const settingsPage = document.getElementById('settings-page');

  // 檢查登入狀態
  const { currentUser } = await chrome.storage.local.get(['currentUser']);
  if (currentUser) showPage(mainMenu);

  function showPage(page) {
    [authPage, mainMenu, saverPage, musicPage, calcPage, settingsPage].forEach(p => p.style.display = 'none');
    page.style.display = 'flex';
  }

  // 登入與註冊
  document.getElementById('login-btn').onclick = () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    chrome.runtime.sendMessage({ action: 'login', username, password }, (res) => {
      if (res.success) showPage(mainMenu);
      else showError(res.error);
    });
  };

  document.getElementById('register-btn').onclick = () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    chrome.runtime.sendMessage({ action: 'register', username, password }, (res) => {
      if (res.success) showPage(mainMenu);
    });
  };

  document.getElementById('logout-btn').onclick = async () => {
    await chrome.storage.local.remove(['currentUser']);
    showPage(authPage);
  };

  function showError(msg) {
    const err = document.getElementById('auth-error');
    err.textContent = msg;
    err.style.display = 'block';
  }

  // 設定頁面邏輯
  const tokenInput = document.getElementById('github-token-input');
  const { githubToken } = await chrome.storage.local.get(['githubToken']);
  if (githubToken) tokenInput.value = githubToken;

  document.getElementById('save-settings-btn').onclick = async () => {
    const token = tokenInput.value.trim();
    await chrome.storage.local.set({ githubToken: token });
    chrome.runtime.sendMessage({ action: 'updateToken', token: token });
    alert('GitHub Token 已儲存並套用！');
    showPage(mainMenu);
  };

  // 頁面切換按鈕
  document.getElementById('go-saver').onclick = () => showPage(saverPage);
  document.getElementById('go-music').onclick = () => { showPage(musicPage); updateMusicList(); };
  document.getElementById('go-calc').onclick = () => showPage(calcPage);
  document.getElementById('go-settings').onclick = () => showPage(settingsPage);
  document.querySelectorAll('.back-btn').forEach(btn => btn.onclick = () => showPage(mainMenu));

  // 網址儲存邏輯
  const savedList = document.getElementById('saved-list');
  const updateSaverList = async () => {
    const { opini_links = [] } = await chrome.storage.local.get(['opini_links']);
    savedList.innerHTML = opini_links.map(link => `
      <div class="saved-item"><a href="${link.url}" target="_blank">${link.displayName}</a></div>
    `).join('');
  };

  document.getElementById('save-btn').onclick = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const name = document.getElementById('custom-name').value || tab.title;
    const { opini_links = [] } = await chrome.storage.local.get(['opini_links']);
    opini_links.unshift({ displayName: name, url: tab.url });
    await chrome.storage.local.set({ opini_links });
    updateSaverList();
  };

  // 音樂清單邏輯
  const musicList = document.getElementById('music-list');
  const updateMusicList = async () => {
    const { opini_music = [] } = await chrome.storage.local.get(['opini_music']);
    musicList.innerHTML = opini_music.map(song => `
      <div class="music-item"><a href="${song.url}" target="_blank">${song.title}</a></div>
    `).join('');
  };

  // 計算機邏輯
  const calcDisplay = document.getElementById('calc-display');
  document.querySelectorAll('.calc-btn').forEach(btn => {
    btn.onclick = () => {
      const val = btn.textContent;
      if (val === 'C') calcDisplay.value = '0';
      else if (val === '=') {
        try { calcDisplay.value = eval(calcDisplay.value); } catch(e) { calcDisplay.value = 'Error'; }
      } else {
        if (calcDisplay.value === '0') calcDisplay.value = val;
        else calcDisplay.value += val;
      }
    };
  });

  updateSaverList();
});
