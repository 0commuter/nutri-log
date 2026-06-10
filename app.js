// app.js (前端核心邏輯)

// ==========================================
// ⚙️ 系統設定區 (請填寫你專屬的資料)
// ==========================================
// 1. 你的自訂 PIN 碼 (請自己設定一組好記的數字，例如 2026)
const MY_PIN = "9111"; 

// 2. 你的後端防護密鑰 (必須跟 Config.gs 裡面的 SECRET_TOKEN 一模一樣)
const SECRET_TOKEN = "MyDietLog@2026"; 

// 3. 你的 GAS 網頁應用程式網址 (請填寫你剛才部署後複製下來的網址)
const GAS_URL = "https://script.google.com/macros/s/AKfycbyDIc4H75NQ-anigZUQD9reN8Ef2xJrvg72I_879vryr_GH84l86dIXuqUuY_kxshuV/exec"; 
// ==========================================

// DOM 元素選取
const lockScreen = document.getElementById('lock-screen');
const appScreen = document.getElementById('app-screen');
const pinInput = document.getElementById('pin-input');
const unlockBtn = document.getElementById('unlock-btn');
const lockError = document.getElementById('lock-error');

const dietForm = document.getElementById('diet-form');
const recordDate = document.getElementById('record-date');
const recordMeal = document.getElementById('record-meal');
const fileInput = document.getElementById('file-input');
const uploadZone = document.getElementById('upload-zone');
const previewImg = document.getElementById('preview-img');
const uploadPrompt = document.getElementById('upload-prompt');
const submitBtn = document.getElementById('submit-btn');
const statusMessage = document.getElementById('status-message');

let currentBase64Image = null;

// ==========================================
// 🔒 1. PIN 碼解鎖與記憶邏輯
// ==========================================
function checkLogin() {
  const savedPin = localStorage.getItem('dietLogPin');
  if (savedPin === MY_PIN) {
    unlockApp();
  } else {
    lockScreen.classList.remove('hidden');
  }
}

function unlockApp() {
  lockScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  initForm();
}

unlockBtn.addEventListener('click', () => {
  if (pinInput.value === MY_PIN) {
    localStorage.setItem('dietLogPin', MY_PIN);
    unlockApp();
  } else {
    lockError.textContent = "PIN 碼錯誤，請重試";
    pinInput.value = "";
  }
});

// ==========================================
// 📅 2. 自動帶入日期與餐次
// ==========================================
function initForm() {
  // 自動填入今天日期
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  recordDate.value = `${year}-${month}-${day}`;

  // 自動判斷當前餐次
  const hour = today.getHours();
  if (hour >= 5 && hour < 10) {
    recordMeal.value = "早餐";
  } else if (hour >= 10 && hour < 14) {
    recordMeal.value = "午餐";
  } else if (hour >= 14 && hour < 17) {
    recordMeal.value = "點心";
  } else {
    recordMeal.value = "晚餐";
  }
}

// ==========================================
// 📷 3. 觸發拍照與相片壓縮處理
// ==========================================
uploadZone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Canvas 壓縮技術 (將寬度限制在 800px 以內)
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = Math.floor(height * (MAX_WIDTH / width));
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // 壓縮品質設定為 0.7，轉成 Base64
      currentBase64Image = canvas.toDataURL('image/jpeg', 0.7);
      
      // 顯示預覽圖
      previewImg.src = currentBase64Image;
      previewImg.classList.remove('hidden');
      uploadPrompt.classList.add('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// ==========================================
// 🚀 4. 表單送出與 API 對接
// ==========================================
const resultContainer = document.getElementById('result-container');

dietForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // 防止網頁重新載入
  
  if (!currentBase64Image) {
    showStatus("請先拍照或上傳一張食物相片！", "error");
    return;
  }

  // 鎖定按鈕避免重複點擊，並先隱藏上一次的結果卡片
  submitBtn.disabled = true;
  submitBtn.textContent = "AI 辨識中，請稍候...";
  resultContainer.style.display = 'none'; 
  showStatus("正在傳送資料至大腦分析中...", "info");

  const payload = {
    token: SECRET_TOKEN,
    action: "logDiet",
    date: recordDate.value,
    meal: recordMeal.value,
    text: document.getElementById('user-text').value || "",
    image: currentBase64Image
  };

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8" // 避免 CORS 預檢問題
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

   if (result.status === "success") {
  showStatus("🎉 登錄成功！資料已寫入試算表。", "success");

  let htmlContent = `
    <div class="result-title">📊 餐點營養明細</div>
    <table class="detail-table">
      <thead>
        <tr>
          <th>食材</th>
          <th>熱量(kcal)</th>
          <th>碳水(g)</th>
          <th>蛋白質(g)</th>
          <th>纖維(g)</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (result.details && result.details.length > 0) {
    result.details.forEach(item => {
      htmlContent += `
        <tr>
          <td>${item.name ?? '-'}</td>
          <td>${item.calories ?? '-'}</td>
          <td>${item.carbs ?? '-'}</td>
          <td>${item.protein ?? '-'}</td>
          <td>${item.fiber ?? '-'}</td>
        </tr>
      `;
    });
  }

  htmlContent += `
    <tr class="goal-row">
      <td>📌 今日目標</td>
      <td>1400</td>
      <td>130</td>
      <td>≥74</td>
      <td>≥25</td>
    </tr>
    <tr class="total-row">
      <td>本餐合計</td>
      <td>${result.totals.calories ?? '-'}</td>
      <td>${result.totals.carbs ?? '-'}</td>
      <td>${result.totals.protein ?? '-'}</td>
      <td>${result.totals.fiber ?? '-'}</td>
    </tr>
      </tbody>
    </table>
  `;

  const formattedReview = (result.review || "無點評內容").replace(/\n/g, '<br>');
  htmlContent += `
    <div class="result-title">👩‍⚕️ 營養師點評與建議</div>
    <div class="review-box">${formattedReview}</div>
  `;

  resultContainer.innerHTML = htmlContent;
  resultContainer.style.display = 'block';
