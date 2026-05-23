document.addEventListener('DOMContentLoaded', async () => {
  const version = "2.7.3";
  document.getElementById('current-version').textContent = version;

  // 頁面切換邏輯
  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const target = document.getElementById(pageId);
    if (target) target.style.display = 'block';
  }

  // 初始化檢查
  const res = await chrome.storage.local.get(['currentUser', 'githubToken']);
  if (res.currentUser && res.githubToken) {
    document.getElementById('user-display-name').textContent = res.currentUser;
    showPage('home-page');
    loadAllData();
  } else {
    showPage('login-page');
  }

  // 導覽邏輯
  document.getElementById('go-to-register').onclick = () => showPage('register-page');
  document.getElementById('go-to-login').onclick = () => showPage('login-page');
  document.getElementById('nav-settings-login').onclick = () => showPage('settings-page');
  
  document.getElementById('nav-urls').onclick = () => { showPage('urls-page'); loadUrls(); };
  document.getElementById('nav-music').onclick = () => { showPage('music-page'); loadMusic(); };
  document.getElementById('nav-clips').onclick = () => { showPage('clips-page'); loadClips(); };
  document.getElementById('nav-save').onclick = () => { showPage('save-page'); loadSave(); };
  document.getElementById('nav-calc').onclick = () => { showPage('calc-page'); initCalc(); };
  document.getElementById('nav-settings').onclick = () => showPage('settings-page');

  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.onclick = () => showPage('home-page');
  });

  // 註冊與登入 (GitHub 雲端驗證)
  document.getElementById('btn-register').onclick = async () => {
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value.trim();
    const token = (await chrome.storage.local.get('githubToken')).githubToken;
    if (!user || !pass || !token) return alert('請填寫完整並設定 Token');
    
    const users = await fetchCloudUsers(token);
    if (users[user]) return alert('帳號已存在');
    users[user] = pass;
    if (await saveCloudUsers(token, users)) {
      alert('註冊成功！');
      showPage('login-page');
    }
  };

  document.getElementById('btn-login').onclick = async () => {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const token = (await chrome.storage.local.get('githubToken')).githubToken;
    if (!user || !pass || !token) return alert('請填寫完整並設定 Token');

    const users = await fetchCloudUsers(token);
    if (users[user] === pass) {
      await chrome.storage.local.set({ currentUser: user });
      document.getElementById('user-display-name').textContent = user;
      showPage('home-page');
      loadAllData();
    } else {
      alert('帳號或密碼錯誤');
    }
  };

  // 網址儲存
  document.getElementById('btn-save-url').onclick = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const name = document.getElementById('url-name').value || tabs[0].title;
    const res = await chrome.storage.local.get('urls');
    const urls = res.urls || [];
    urls.unshift({ name, url: tabs[0].url });
    await chrome.storage.local.set({ urls });
    loadUrls();
  };

  // 計算機邏輯
  function initCalc() {
    const display = document.getElementById('calc-display');
    let current = '0';
    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.onclick = () => {
        const val = btn.dataset.val;
        if (val === 'C') current = '0';
        else if (val === '=') { try { current = eval(current.replace('÷', '/').replace('×', '*')).toString(); } catch { current = 'Error'; } }
        else if (val === 'back') current = current.length > 1 ? current.slice(0, -1) : '0';
        else current = current === '0' ? val : current + val;
        display.textContent = current;
      };
    });
  }

  // 資料加載 (通用刪除邏輯)
  async function loadUrls() { renderList('urls', 'urls-list'); }
  async function loadMusic() { renderList('music', 'music-list'); }
  async function loadClips() { renderList('clips', 'clips-list'); }
  async function loadSave() { renderList('ytsage', 'save-list'); }

  async function renderList(key, elementId) {
    const res = await chrome.storage.local.get(key);
    const list = document.getElementById(elementId);
    list.innerHTML = '';
    (res[key] || []).forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `
        <span class="item-name">${item.name || item.title || item.text || item.url}</span>
        <button class="btn-delete">刪除</button>
      `;
      div.querySelector('.item-name').onclick = () => {
        if (item.url) window.open(item.url);
        else if (item.text) { navigator.clipboard.writeText(item.text); alert('已複製到剪貼板'); }
      };
      div.querySelector('.btn-delete').onclick = async () => {
        res[key].splice(idx, 1);
        await chrome.storage.local.set({ [key]: res[key] });
        renderList(key, elementId);
      };
      list.appendChild(div);
    });
  }

  // GitHub API 輔助
  async function fetchCloudUsers(token) {
    const url = `https://api.github.com/repos/lan2015se-collab/opini-data/contents/users.json`;
    const res = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
    if (res.ok) {
      const data = await res.json();
      return JSON.parse(decodeURIComponent(escape(atob(data.content))));
    }
    return {};
  }

  async function saveCloudUsers(token, users) {
    const url = `https://api.github.com/repos/lan2015se-collab/opini-data/contents/users.json`;
    let sha = null;
    const check = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
    if (check.ok) sha = (await check.json()).sha;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(users, null, 2))));
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Update users', content, sha })
    });
    return res.ok;
  }
});
