// app.js (前端核心邏輯 - 完美排版除錯版)

// ==========================================
// ⚙️ 系統設定區
// ==========================================
const MY_PIN = "9111"; 
const SECRET_TOKEN = "MyDietLog@2026"; 
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
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  recordDate.value = `${year}-${month}-${day}`;

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

      currentBase64Image = canvas.toDataURL('image/jpeg', 0.7);
      
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
  e.preventDefault(); 
  
  if (!currentBase64Image) {
    showStatus("請先拍照或上傳一張食物相片！", "error");
    return;
  }

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
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.status === "success") {
      showStatus("🎉 登錄成功！資料已寫入試算表。", "success");
      
      // ----------------------------------------------------
      // 🎨 開始動態繪製「雙層表格」與「營養師點評」
      // ----------------------------------------------------
      
      // 🥇 建立數字修剪精靈 (確保最多只有 1 位小數，消滅浮點數誤差)
      const formatNum = (num) => Math.round(Number(num) * 10) / 10;

      // 第一張表：今日營養總覽 (本餐 / 累計 / 剩餘)
      let htmlContent = `
        <div class="result-title">🎯 今日營養總覽</div>
        <div class="table-responsive">
          <table class="detail-table">
            <thead>
              <tr>
                <th>指標</th>
                <th>本餐新增</th>
                <th>今日累計</th>
                <th>剩餘額度</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>熱量<br>(kcal)</td>
                <td>+${formatNum(result.totals.calories)}</td>
                <td><strong>${formatNum(result.cumulative.calories)}</strong></td>
                <td style="color: ${result.remaining.calories < 0 ? 'red' : 'green'}; font-weight: bold;">${formatNum(result.remaining.calories)}</td>
              </tr>
              <tr>
                <td>蛋白質<br>(g)</td>
                <td>+${formatNum(result.totals.protein)}</td>
                <td><strong>${formatNum(result.cumulative.protein)}</strong></td>
                <td style="color: ${result.remaining.protein < 0 ? 'red' : 'green'}; font-weight: bold;">${formatNum(result.remaining.protein)}</td>
              </tr>
              <tr>
                <td>碳水<br>(g)</td>
                <td>+${formatNum(result.totals.carbs)}</td>
                <td><strong>${formatNum(result.cumulative.carbs)}</strong></td>
                <td style="color: ${result.remaining.carbs < 0 ? 'red' : 'green'}; font-weight: bold;">${formatNum(result.remaining.carbs)}</td>
              </tr>
              <tr>
                <td>纖維<br>(g)</td>
                <td>+${formatNum(result.totals.fiber)}</td>
                <td><strong>${formatNum(result.cumulative.fiber)}</strong></td>
                <td style="color: ${result.remaining.fiber < 0 ? 'red' : 'green'}; font-weight: bold;">${formatNum(result.remaining.fiber)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="result-title" style="margin-top: 25px;">🥗 本餐單品明細</div>
        <div class="table-responsive">
          <table class="detail-table">
            <thead>
              <tr>
                <th>食物項目</th>
                <th>熱量<br>(kcal)</th>
                <th>蛋白質<br>(g)</th>
                <th>碳水化合物<br>(g)</th>
                <th>纖維<br>(g)</th>
              </tr>
            </thead>
            <tbody>
      `;

      // 🥈 第二張表：還原截圖的單品明細 (套用數字修剪)
      if (result.details && result.details.length > 0) {
          result.details.forEach(item => {
              htmlContent += `
                <tr>
                  <td>${item.name}</td>
                  <td>${formatNum(item.calories)}</td>
                  <td>${formatNum(item.protein)}</td>
                  <td>${formatNum(item.carbs)}</td>
                  <td>${formatNum(item.fiber || 0)}</td>
                </tr>
              `;
          });
      }

      // 補上總計列，完美對齊 (套用數字修剪)
      htmlContent += `
              <tr class="total-row">
                <td>總計</td>
                <td>約 ${formatNum(result.totals.calories)}</td>
                <td>約 ${formatNum(result.totals.protein)}</td>
                <td>約 ${formatNum(result.totals.carbs)}</td>
                <td>約 ${formatNum(result.totals.fiber)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      // 🎨 究極 Markdown 解析器
      let formattedReview = result.review || "無點評內容";
      formattedReview = formattedReview
        .replace(/### (.*?)(?=\n|$)/g, '<div style="font-size: 1.1rem; font-weight: bold; color: #1a5e20; margin-top: 15px; margin-bottom: 5px;">$1</div>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #d32f2f;">$1</strong>')
        .replace(/^[\-\*]\s+(.*?)(?=\n|$)/gm, '<div style="margin-left: 15px; text-indent: -10px;">• $1</div>')
        .replace(/\n/g, '<br>');

      htmlContent += `
        <div class="result-title" style="margin-top: 25px;">👩‍⚕️ 營養師點評與建議</div>
        <div class="review-box">${formattedReview}</div>
      `;

      // 把畫好的內容塞進盒子裡，並顯示出來
      resultContainer.innerHTML = htmlContent;
      resultContainer.style.display = 'block';

      // ----------------------------------------------------
      // 🧹 清理輸入框準備下一次紀錄 (保留結果卡片)
      // ----------------------------------------------------
      document.getElementById('user-text').value = "";
      currentBase64Image = null;
      previewImg.classList.add('hidden');
      previewImg.src = "";
      uploadPrompt.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "傳送 AI 辨識";

    } else {
      showStatus("❌ 登錄失敗：" + result.message, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "傳送 AI 辨識";
    }
  } catch (error) {
    showStatus("❌ 網路連線錯誤，請檢查網路狀態。", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "傳送 AI 辨識";
  }
});

function showStatus(msg, type) {
  statusMessage.textContent = msg;
  statusMessage.className = `status-box ${type}`;
  statusMessage.classList.remove('hidden');
}

// 啟動程式：檢查登錄狀態
checkLogin();
