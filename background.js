const API_URL = 'https://free.v36.cm/v1/chat/completions';
const API_KEY = 'sk-xvowcY9bmQsc6i4oC7B20dB29a44441a8844B157516a15E2';
const GITHUB_DATA_REPO = 'lan2015se-collab/opini-data';

let GITHUB_TOKEN = '';
let currentUser = null;
let isSyncing = false;

// 初始化
chrome.storage.local.get(['githubToken', 'currentUser'], (data) => {
  if (data.githubToken) GITHUB_TOKEN = data.githubToken;
  if (data.currentUser) currentUser = data.currentUser;
});

// 每 10 秒同步一次 (調整為更穩定的頻率)
setInterval(async () => {
  if (currentUser && GITHUB_TOKEN && !isSyncing) {
    await syncDataToGitHub();
  }
}, 10000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  if (request.type === "TOKEN_UPDATED") {
    GITHUB_TOKEN = request.token;
    return;
  }

  if (request.type === "ANALYZE_MUSIC") {
    analyzeMusic(request.url);
    return;
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
    saveToMusic(request.title, request.url).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
});

async function saveToMusic(title, url) {
  const res = await chrome.storage.local.get('music');
  const music = res.music || [];
  if (!music.some(m => m.url === url)) {
    music.unshift({ title, url, date: new Date().toLocaleString() });
    await chrome.storage.local.set({ music });
  }
}

async function analyzeMusic(url) {
  const res = await chrome.storage.local.get('music');
  const music = res.music || [];
  const index = music.findIndex(m => m.url === url);
  if (index !== -1) {
    music[index].title = "🎵 " + music[index].title;
    await chrome.storage.local.set({ music });
  }
}

async function fetchSummary(prompt) {
  try {
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
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    throw new Error("API 回傳格式錯誤");
  } catch (e) {
    return "AI 總結暫時無法使用: " + e.message;
  }
}

async function syncDataToGitHub() {
  if (!currentUser || !GITHUB_TOKEN) return;
  isSyncing = true;
  try {
    const storage = await chrome.storage.local.get(['urls', 'music', 'clips', 'ytsage']);
    const content = btoa(unescape(encodeURIComponent(JSON.stringify({
      user: currentUser,
      data: storage
    }, null, 2))));

    const path = `data/${currentUser}.json`;
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
        message: `Cloud Sync for ${currentUser}`,
        content: content,
        sha: sha
      })
    });
    console.log('GitHub Sync Success');
  } catch (e) {
    console.error('GitHub Sync Failed', e);
  } finally {
    isSyncing = false;
  }
}
