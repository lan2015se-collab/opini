// YouTube 內容腳本：在訂閱按鈕旁注入 opini 按鈕

function injectOpiniButton() {
  // 等待 YouTube 頁面完全載入
  const checkAndInject = setInterval(() => {
    // 尋找訂閱按鈕容器 (通常在頻道名稱旁邊)
    const subscribeBtn = document.querySelector('yt-formatted-string[aria-label*="訂閱"]') || 
                         document.querySelector('button[aria-label*="Subscribe"]') ||
                         document.querySelector('button[aria-label*="訂閱"]');
    
    if (subscribeBtn && !document.getElementById('opini-add-btn')) {
      // 找到訂閱按鈕，在其旁邊插入 opini 按鈕
      const container = subscribeBtn.closest('div[class*="style-scope"]') || subscribeBtn.parentElement;
      
      if (container) {
        const opiniBtn = document.createElement('button');
        opiniBtn.id = 'opini-add-btn';
        opiniBtn.setAttribute('aria-label', '新增到 OpiniMusic');
        opiniBtn.style.cssText = `
          background: #ff0000;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 20px;
          font-weight: 500;
          cursor: pointer;
          font-size: 14px;
          margin-left: 8px;
          transition: background 0.2s;
        `;
        opiniBtn.textContent = '新增到 OpiniMusic';
        
        opiniBtn.onmouseover = () => { opiniBtn.style.background = '#cc0000'; };
        opiniBtn.onmouseout = () => { opiniBtn.style.background = '#ff0000'; };
        
        opiniBtn.onclick = () => {
          const title = document.querySelector('h1.title yt-formatted-string')?.textContent || 
                        document.querySelector('h1 yt-formatted-string')?.textContent ||
                        document.title.replace(' - YouTube', '');
          const url = window.location.href;
          
          // 傳送訊息給背景腳本儲存資料
          chrome.runtime.sendMessage({
            action: 'addToOpiniMusic',
            title: title,
            url: url
          }, (response) => {
            if (response && response.success) {
              // 按鈕變綠色表示成功
              opiniBtn.style.background = '#00cc00';
              opiniBtn.textContent = '✓ 已新增';
              setTimeout(() => {
                opiniBtn.style.background = '#ff0000';
                opiniBtn.textContent = '新增到 OpiniMusic';
              }, 2000);
            }
          });
        };
        
        container.appendChild(opiniBtn);
        clearInterval(checkAndInject);
      }
    }
  }, 500);
  
  // 最多檢查 30 次 (15 秒)
  let attempts = 0;
  const originalInterval = setInterval;
  let intervalId = checkAndInject;
  
  setTimeout(() => {
    clearInterval(intervalId);
  }, 15000);
}

// 頁面載入時執行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectOpiniButton);
} else {
  injectOpiniButton();
}

// 監聽動態頁面變化 (YouTube 使用動態加載)
const observer = new MutationObserver(() => {
  if (!document.getElementById('opini-add-btn')) {
    injectOpiniButton();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
