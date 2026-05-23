const API_URL = 'https://free.v36.cm/v1/chat/completions';
const API_KEY = 'sk-xvowcY9bmQsc6i4oC7B20dB29a44441a8844B157516a15E2';
const GITHUB_DATA_REPO = 'lan2015se-collab/opini-data';
// 注意：在實際瀏覽器環境中，需要使用者授權 GitHub Token
// 這裡假設使用者已透過某種方式提供或擴充功能已獲得存取權限
let GITHUB_TOKEN = ''; 

let currentUser = null;
let isSyncing = false;

// 每秒同步一次資料
setInterval(async () => {
  if (currentUser && !isSyncing) {
    await syncDataToGitHub();
  }
}, 1000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
  // 實際應用中，這裡會先檢查 GitHub 上是否存在該使用者的 json 檔案
  if (data.action === 'register') {
    currentUser = { username, password };
    await chrome.storage.local.set({ currentUser });
    // 初始化雲端檔案
    await syncDataToGitHub(true); 
    return { success: true };
  } else {
    // 登入時嘗試從 GitHub 抓取資料
    currentUser = { username, password };
    const success = await pullDataFromGitHub();
    if (success) {
      await chrome.storage.local.set({ currentUser });
      return { success: true };
    }
    return { success: false, error: '帳號不存在或同步失敗' };
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
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      throw new Error('AI 解析失敗，請檢查網路或 API 狀態');
    }
  } catch (e) {
    throw e;
  }
}

async function syncDataToGitHub(isNew = false) {
  if (!currentUser) return;
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
    
    // 先獲取檔案 sha (如果存在)
    let sha = null;
    try {
      const res = await fetch(url, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } });
      if (res.ok) {
        const fileData = await res.json();
        sha = fileData.sha;
      }
    } catch (e) {}

    await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Sync data for ${currentUser.username}`,
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
  if (!currentUser) return false;
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
  } catch (e) {
    console.error('抓取失敗', e);
  }
  return false;
}
