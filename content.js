function injectOpiniButtons() {
  // 嘗試多種可能的訂閱按鈕選擇器
  const selectors = [
    'yt-formatted-string[aria-label*="訂閱"]',
    'button[aria-label*="Subscribe"]',
    'button[aria-label*="訂閱"]',
    '#subscribe-button',
    'ytd-subscribe-button-renderer'
  ];
  
  let subscribeBtn = null;
  for (const selector of selectors) {
    subscribeBtn = document.querySelector(selector);
    if (subscribeBtn) break;
  }
  
  if (subscribeBtn && !document.getElementById('opini-btn-group')) {
    const container = subscribeBtn.closest('#top-level-buttons-computed') || 
                      subscribeBtn.closest('div[class*="style-scope"]') || 
                      subscribeBtn.parentElement;
    
    if (container) {
      const btnGroup = document.createElement('div');
      btnGroup.id = 'opini-btn-group';
      btnGroup.style.display = 'inline-flex';
      btnGroup.style.marginLeft = '12px';
      btnGroup.style.gap = '8px';
      btnGroup.style.alignItems = 'center';

      // 按鈕 1: 新增到 OpiniMusic
      const addBtn = document.createElement('button');
      addBtn.textContent = '新增到 OpiniMusic';
      styleButton(addBtn, '#ff0000');
      addBtn.onclick = () => {
        const title = getYTTitle();
        chrome.runtime.sendMessage({
          action: 'addToOpiniMusic',
          title: title,
          url: window.location.href
        }, (res) => {
          if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError);
            alert('通訊失敗，請重新整理頁面');
            return;
          }
          if (res && res.success) {
            addBtn.textContent = '✓ 已新增';
            addBtn.style.background = '#00cc00';
            setTimeout(() => {
              addBtn.textContent = '新增到 OpiniMusic';
              styleButton(addBtn, '#ff0000');
            }, 2000);
          }
        });
      };

      // 按鈕 2: AI 總結
      const summaryBtn = document.createElement('button');
      summaryBtn.textContent = 'AI 總結';
      styleButton(summaryBtn, '#0078d4');
      summaryBtn.onclick = () => {
        const title = getYTTitle();
        const channel = document.querySelector('yt-formatted-string.ytd-channel-name a')?.textContent || 
                        document.querySelector('#channel-name a')?.textContent || '未知發布者';
        const duration = document.querySelector('.ytp-time-duration')?.textContent || '未知時長';
        
        showModal('AI 正在分析影片內容...', true);
        
        const prompt = `影片標題: ${title}\n發布者: ${channel}\n影片時長: ${duration}\n請根據以上資訊總結這部影片。`;
        
        chrome.runtime.sendMessage({ action: 'getAiSummary', prompt: prompt }, (res) => {
          if (chrome.runtime.lastError) {
            showModal('通訊失敗，請重新整理頁面', false);
            return;
          }
          if (res && res.success) {
            showModal(res.summary, false);
          } else {
            showModal('分析失敗: ' + (res ? res.error : '未知錯誤'), false);
          }
        });
      };

      btnGroup.appendChild(addBtn);
      btnGroup.appendChild(summaryBtn);
      
      // 確保插入在訂閱按鈕之後
      if (subscribeBtn.nextSibling) {
        container.insertBefore(btnGroup, subscribeBtn.nextSibling);
      } else {
        container.appendChild(btnGroup);
      }
    }
  }
}

function styleButton(btn, color) {
  btn.style.cssText = `
    background: ${color};
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 18px;
    font-weight: bold;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
    font-family: 'Inter', sans-serif;
    white-space: nowrap;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;
  btn.onmouseover = () => {
    btn.style.opacity = '0.9';
    btn.style.transform = 'translateY(-1px)';
  };
  btn.onmouseout = () => {
    btn.style.opacity = '1';
    btn.style.transform = 'translateY(0)';
  };
}

function getYTTitle() {
  return document.querySelector('h1.title yt-formatted-string')?.textContent || 
         document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent ||
         document.querySelector('#title h1 yt-formatted-string')?.textContent ||
         document.title.replace(' - YouTube', '');
}

function showModal(content, isLoading) {
  let modal = document.getElementById('opini-summary-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'opini-summary-modal';
    modal.style.cssText = `
      position: fixed; top: 100px; right: 20px; width: 320px; 
      background: #111; color: white; border: 1px solid #444; 
      border-radius: 12px; padding: 18px; z-index: 999999; 
      box-shadow: 0 10px 40px rgba(0,0,0,0.8); font-family: 'Inter', sans-serif;
    `;
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #444; padding-bottom:12px; margin-bottom:12px;">
      <h3 style="margin:0; font-size:16px; font-weight:bold; color:#fff;">🎬 影片 AI 總結</h3>
      <button id="opini-modal-close" style="background:none; border:none; color:#aaa; font-size:24px; cursor:pointer; line-height:1; transition:color 0.2s;">&times;</button>
    </div>
    <div id="opini-summary-content" style="line-height:1.6; font-size:14px; max-height:400px; overflow-y:auto; color:#eee;">
      ${content.replace(/\n/g, '<br>')}
    </div>
    ${isLoading ? '<div style="margin-top:15px; text-align:center; font-size:12px; color:#0078d4;">⏳ 正在呼叫 AI 分析中...</div>' : ''}
  `;

  const closeBtn = document.getElementById('opini-modal-close');
  closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
  closeBtn.onmouseout = () => closeBtn.style.color = '#aaa';
  closeBtn.onclick = () => modal.remove();
}

// 監聽頁面變化 (YouTube 是單頁應用，導航不會重新加載頁面)
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(injectOpiniButtons, 2000); // 延遲注入確保頁面加載完成
  }
}, 1000);

const observer = new MutationObserver(injectOpiniButtons);
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(injectOpiniButtons, 2000);
