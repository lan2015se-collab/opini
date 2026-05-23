const API_URL = 'https://free.v36.cm/v1/chat/completions';
const API_KEY = 'sk-xvowcY9bmQsc6i4oC7B20dB29a44441a8844B157516a15E2';
const GITHUB_DATA_REPO = 'lan2015se-collab/opini-data';

let GITHUB_TOKEN = '';
let currentUser = null;
let isSyncing = false;

// 初始化時從儲存空間讀取 Token
chrome.storage.local.get(['githubToken', 'currentUser'], (data) => {
  if (data.githubToken) GITHUB_TOKEN = data.githubToken;
  if (data.currentUser) currentUser = data.currentUser;
});

// 每秒同步一次資料
setInterval(async () => {
  if (currentUser && GITHUB_TOKEN && !isSyncing) {
    await syncDataToGitHub();
  }
}, 1000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateToken') {
    GITHUB_TOKEN = request.token;
    sendResponse({ success: true });
    return;
  }

  if (request.action === 'login' || request.action === 'register') {
    handleAuth(request).then(res => sendResponse(res));
    return true;
  }

  if (request.action === 'getAiSummary') {
    fetchSummary(request.prompt).then(summary => {
      sendResponse({ success: true, summary: summary });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
  
  if (request.action === 'addToOpiniMusic') {
    chrome.storage.local.get(['opini_music'], (data) => {
      const songs = data.opini_music || [];
      if (!songs.some(s => s.url === request.url)) {
        songs.unshift({ title: request.title, url: request.url, artist: 'YouTube' });
        chrome.storage.local.set({ opini_music: songs }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }
});

async function handleAuth(data) {
  const { username, password } = data;
  if (data.action === 'register') {
    currentUser = { username, password };
    await chrome.storage.local.set({ currentUser });
    if (GITHUB_TOKEN) await syncDataToGitHub(); 
    return { success: true };
  } else {
    currentUser = { username, password };
    if (GITHUB_TOKEN) {
      const success = await pullDataFromGitHub();
      if (success) {
        await chrome.storage.local.set({ currentUser });
        return { success: true };
      }
    } else {
      // 若無 Token 則先本地登入
      await chrome.storage.local.set({ currentUser });
      return { success: true };
    }
    return { success: false, error: '登入失敗，請檢查 Token 或帳密' };
  }
}

async function fetchSummary(prompt) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一個專業的影片分析助手。請根據提供的資訊回答：發布者、影片時長、以及內容核心摘要。' },
        { role: 'user', content: prompt }
      ]
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

async function syncDataToGitHub() {
  if (!currentUser || !GITHUB_TOKEN) return;
  isSyncing = true;
  try {
    const storage = await chrome.storage.local.get(['opini_links', 'opini_music']);
    const content = btoa(unescape(encodeURIComponent(JSON.stringify({
      password: currentUser.password,
      links: storage.opini_links || [],
      music: storage.opini_music || []
    }, null, 2))));

    const path = `data/${currentUser.username}.json`;
    const url = `https://api.github.com/repos/${GITHUB_DATA_REPO}/contents/${path}`;
    
    let sha = null;
    const res = await fetch(url, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } });
    if (res.ok) {
      const fileData = await res.json();
      sha = fileData.sha;
    }

    await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Sync for ${currentUser.username}`,
        content: content,
        sha: sha
      })
    });
  } catch (e) {
    console.error('同步失敗', e);
  } finally {
    isSyncing = false;
  }
}

async function pullDataFromGitHub() {
  if (!currentUser || !GITHUB_TOKEN) return false;
  try {
    const path = `data/${currentUser.username}.json`;
    const url = `https://api.github.com/repos/${GITHUB_DATA_REPO}/contents/${path}`;
    const res = await fetch(url, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } });
    if (res.ok) {
      const data = await res.json();
      const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
      if (content.password === currentUser.password) {
        await chrome.storage.local.set({
          opini_links: content.links,
          opini_music: content.music
        });
        return true;
      }
    }
  } catch (e) {}
  return false;
}
