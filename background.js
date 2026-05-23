const API_URL = 'https://free.v36.cm/v1/chat/completions';
const API_KEY = 'sk-xvowcY9bmQsc6i4oC7B20dB29a44441a8844B157516a15E2';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAiSummary') {
    fetchSummary(request.prompt).then(summary => {
      sendResponse({ success: true, summary: summary });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // 保持異步
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

async function fetchSummary(prompt) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo', // 或根據 API 支援的模型調整
      messages: [
        { role: 'system', content: '你是一個專業的影片分析助手。請根據提供的資訊回答：發布者、影片時長、以及內容核心摘要。' },
        { role: 'user', content: prompt }
      ]
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}
