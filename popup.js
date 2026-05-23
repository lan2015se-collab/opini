const VERSION = "2.7.2";

// 介面切換邏輯
function showScreen(screenId) {
  console.log('Showing screen:', screenId);
  document.querySelectorAll('.screen, .tab-content').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
    // 如果是顯示主畫面，確保工具網格也是可見的
    if (screenId === 'main-screen') {
      const toolGrid = target.querySelector('.tool-grid');
      if (toolGrid) toolGrid.classList.remove('hidden');
    }
  }
}

document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    showScreen(targetId);
  });
});

document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => showScreen('main-screen'));
});

// 帳號系統
document.getElementById('show-register').addEventListener('click', () => showScreen('register-screen'));
document.getElementById('show-login').addEventListener('click', () => showScreen('login-screen'));

document.getElementById('register-btn').addEventListener('click', async () => {
  const user = document.getElementById('reg-username').value.trim();
  const pass = document.getElementById('reg-password').value.trim();
  if (!user || !pass) return alert("請輸入完整資訊");
  
  chrome.storage.local.set({ [`user_${user}`]: pass }, () => {
    alert("註冊成功！請登入");
    showScreen('login-screen');
  });
});

document.getElementById('login-btn').addEventListener('click', async () => {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value.trim();
  
  if (!user || !pass) return alert("請輸入帳號密碼");

  chrome.storage.local.get([`user_${user}`], (res) => {
    if (res[`user_${user}`] && res[`user_${user}`] === pass) {
      chrome.storage.local.set({ currentUser: user }, () => {
        initApp(user);
      });
    } else {
      alert("帳號或密碼錯誤");
    }
  });
});

document.getElementById('logout-btn').addEventListener('click', () => {
  chrome.storage.local.remove('currentUser', () => {
    location.reload();
  });
});

// 初始化應用
function initApp(user) {
  document.getElementById('display-user').innerText = `你好, ${user}`;
  showScreen('main-screen');
  loadAllData();
}

// 資料加載與渲染
async function loadAllData() {
  const res = await chrome.storage.local.get(['urls', 'music', 'clips', 'ytsage']);
  renderList('url-list', res.urls || [], 'urls');
  renderList('music-list', res.music || [], 'music');
  renderList('clip-list', res.clips || [], 'clips');
  renderList('ytsage-list', res.ytsage || [], 'ytsage');
}

function renderList(elementId, data, type) {
  const list = document.getElementById(elementId);
  if (!list) return;
  list.innerHTML = '';
  data.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div class="item-info">
        <div class="item-title">${item.title || item.text || '未命名'}</div>
        <div class="item-meta">${item.url || ''}</div>
      </div>
      <button class="del-btn" data-index="${index}">刪除</button>
    `;
    div.querySelector('.item-info').onclick = () => {
      if (item.url) chrome.tabs.create({ url: item.url });
      if (item.text) {
        navigator.clipboard.writeText(item.text);
        alert("已複製到剪貼板");
      }
    };
    div.querySelector('.del-btn').onclick = (e) => {
      e.stopPropagation();
      deleteItem(type, index);
    };
    list.appendChild(div);
  });
}

async function deleteItem(type, index) {
  const res = await chrome.storage.local.get(type);
  const data = res[type] || [];
  data.splice(index, 1);
  await chrome.storage.local.set({ [type]: data });
  loadAllData();
}

// 各功能儲存邏輯
document.getElementById('save-current').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const customName = document.getElementById('custom-name').value;
  const newUrl = { title: customName || tabs[0].title, url: tabs[0].url };
  
  const res = await chrome.storage.local.get('urls');
  const urls = res.urls || [];
  urls.push(newUrl);
  await chrome.storage.local.set({ urls });
  document.getElementById('custom-name').value = '';
  loadAllData();
});

document.getElementById('add-music').addEventListener('click', async () => {
  const url = document.getElementById('music-url').value;
  if (!url) return;
  const newMusic = { title: "音樂解析中...", url: url };
  const res = await chrome.storage.local.get('music');
  const music = res.music || [];
  music.push(newMusic);
  await chrome.storage.local.set({ music });
  document.getElementById('music-url').value = '';
  loadAllData();
  chrome.runtime.sendMessage({ type: "ANALYZE_MUSIC", url: url });
});

document.getElementById('save-clip').addEventListener('click', async () => {
  const text = document.getElementById('clip-text').value;
  if (!text) return;
  const newClip = { text: text, date: new Date().toLocaleString() };
  const res = await chrome.storage.local.get('clips');
  const clips = res.clips || [];
  clips.push(newClip);
  await chrome.storage.local.set({ clips });
  document.getElementById('clip-text').value = '';
  loadAllData();
});

document.getElementById('ytsage-save').addEventListener('click', async () => {
  const url = document.getElementById('ytsage-url').value;
  if (!url) return;
  const newItem = { title: "YTSage 保存中...", url: url };
  const res = await chrome.storage.local.get('ytsage');
  const ytsage = res.ytsage || [];
  ytsage.push(newItem);
  await chrome.storage.local.set({ ytsage });
  document.getElementById('ytsage-url').value = '';
  loadAllData();
});

// 計算機邏輯
let calcValue = "0";
let calcHistory = "";
const calcResultEl = document.getElementById('calc-result');
const calcHistoryEl = document.getElementById('calc-history');

document.querySelectorAll('.calc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.val;
    if (val === 'C') {
      calcValue = "0";
      calcHistory = "";
    } else if (val === 'back') {
      calcValue = calcValue.length > 1 ? calcValue.slice(0, -1) : "0";
    } else if (val === '=') {
      try {
        calcHistory = calcValue;
        calcValue = eval(calcValue.replace('×', '*').replace('÷', '/')).toString();
      } catch {
        calcValue = "Error";
      }
    } else if (val === 'pm') {
      calcValue = (parseFloat(calcValue) * -1).toString();
    } else {
      if (calcValue === "0" && !isNaN(val)) calcValue = val;
      else calcValue += val;
    }
    calcResultEl.innerText = calcValue;
    calcHistoryEl.innerText = calcHistory;
  });
});

// Token 儲存
document.getElementById('save-token').addEventListener('click', () => {
  const token = document.getElementById('gh-token').value.trim();
  chrome.storage.local.set({ githubToken: token }, () => {
    alert("Token 已儲存並啟動雲端同步");
    chrome.runtime.sendMessage({ type: "TOKEN_UPDATED", token: token });
  });
});

// 啟動檢查
chrome.storage.local.get(['currentUser', 'githubToken'], (res) => {
  if (res.currentUser) {
    initApp(res.currentUser);
  } else {
    showScreen('login-screen');
  }
  if (res.githubToken) document.getElementById('gh-token').value = res.githubToken;
});

// 版本檢查
fetch("https://api.github.com/repos/lan2015se-collab/opini/releases/latest")
  .then(r => r.json())
  .then(data => {
    if (data.tag_name && data.tag_name !== `v${VERSION}`) {
      const overlay = document.getElementById('update-overlay');
      const verSpan = document.getElementById('new-version');
      if (overlay && verSpan) {
        verSpan.innerText = data.tag_name;
        overlay.classList.remove('hidden');
      }
    }
  }).catch(e => console.log('Version check failed:', e));
