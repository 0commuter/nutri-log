// app.js (前端核心邏輯)

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
      // LineMessaging.gs (終極排版極簡版 - 二次查核通過)

function sendDailySummary() {
  const today = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd");
  const displayDate = Utilities.formatDate(new Date(), "GMT+8", "M/d"); // 產生如 "6/13" 的簡短格式
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return; 
  
  const data = sheet.getDataRange().getValues();
  let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFiber = 0;
  let tableRows = [];
  let lastReview = "今天尚未有 AI 點評紀錄。";

  // 建立表頭
  tableRows.push(createFlexTableRow("餐別", "餐點內容簡述", "熱量", "蛋白", "碳水", "纖維", true));

  // 撈取今日數據
  for (let i = 1; i < data.length; i++) {
    const cellDate = data[i][0];
    const rowDateStr = cellDate instanceof Date ? Utilities.formatDate(cellDate, "GMT+8", "yyyy-MM-dd") : String(cellDate);
    
    if (rowDateStr === today) {
      const meal = data[i][1];
      const food = data[i][2];
      const cal = Number(data[i][3]) || 0;
      const pro = Number(data[i][4]) || 0;
      const carb = Number(data[i][5]) || 0;
      const fib = Number(data[i][6]) || 0;
      const review = data[i][7];
      
      totalCalories += cal;
      totalProtein += pro;
      totalCarbs += carb;
      totalFiber += fib;
      
      // 單品數值也加上四捨五入（最多一位小數），避免單品數值破壞版面
      const cleanCal = Math.round(cal * 10) / 10;
      const cleanPro = Math.round(pro * 10) / 10;
      const cleanCarb = Math.round(carb * 10) / 10;
      const cleanFib = Math.round(fib * 10) / 10;
      
      tableRows.push(createFlexTableRow(meal, food, cleanCal, cleanPro, cleanCarb, cleanFib, false));
      if (review) lastReview = review; 
    }
  }

  if (tableRows.length === 1) { 
    pushLineMessage([{ type: "text", text: "您今天尚未登錄任何飲食紀錄喔！" }]);
    return;
  }

  // 將總計數值四捨五入（最多一位小數）
  const cleanTotalCal = Math.round(totalCalories * 10) / 10;
  const cleanTotalPro = Math.round(totalProtein * 10) / 10;
  const cleanTotalCarb = Math.round(totalCarbs * 10) / 10;
  const cleanTotalFib = Math.round(totalFiber * 10) / 10;

  // 建立總計列
  tableRows.push({ type: "separator", margin: "md", color: "#eeeeee" });
  tableRows.push(createFlexTableRow("總計", "一日攝取估值", cleanTotalCal, cleanTotalPro, cleanTotalCarb, cleanTotalFib, true));

  // ✨ 擷取特定的 Gemini 點評區塊
  let filteredReview = "";
  const targetSectionMatch = lastReview.match(/### 🎯 今日進度與剩餘額度[\s\S]*?(?=###|$)/);
  if (targetSectionMatch) {
    filteredReview = targetSectionMatch[0]
      .replace(/### /g, '') // ✨ 拿掉 Markdown 的 H3 井字號標記，LINE 才會乾淨
      .replace(/\*\*/g, '') // 拿掉粗體星號
      .trim();
  } else {
    filteredReview = "🎯 今日進度與剩餘額度\n今日數據已統整，請檢視上方數值。";
  }

  // 傳送 Flex Message 卡片
  const flexMessage = {
    type: "flex",
    altText: "🍎 今日飲食數據總表",
    contents: {
      type: "bubble",
      size: "giga", 
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "md",
        contents: [
          // 修改標題為包含簡短日期的格式
          { type: "text", text: `📊 ${displayDate} 最新今日飲食數據總表`, weight: "bold", size: "md", color: "#333333" },
          { type: "separator", margin: "md", color: "#333333" },
          { type: "box", layout: "vertical", margin: "md", spacing: "xs", contents: tableRows },
          { type: "separator", margin: "xl", color: "#eeeeee" },
          // 直接輸出乾淨俐落的剩餘額度區塊
          { type: "text", text: filteredReview, size: "sm", color: "#444444", wrap: true, margin: "sm" }
        ]
      }
    }
  };

  pushLineMessage([flexMessage]);
}

function createFlexTableRow(col1, col2, col3, col4, col5, col6, isBold = false) {
  const fontWeight = isBold ? "bold" : "regular";
  const textColor = isBold ? "#111111" : "#444444";
  const size = isBold ? "xs" : "sm";
  
  return {
    type: "box",
    layout: "horizontal",
    spacing: "none",
    paddingTop: "xs",
    paddingBottom: "xs",
    contents: [
      { type: "text", text: String(col1), size: size, color: textColor, weight: fontWeight, flex: 3 },
      { type: "text", text: String(col2), size: size, color: textColor, weight: fontWeight, flex: 7, wrap: true },
      { type: "text", text: String(col3), size: size, color: textColor, weight: fontWeight, flex: 3, align: "end" },
      { type: "text", text: String(col4), size: size, color: textColor, weight: fontWeight, flex: 2, align: "end" },
      { type: "text", text: String(col5), size: size, color: textColor, weight: fontWeight, flex: 2, align: "end" },
      { type: "text", text: String(col6), size: size, color: textColor, weight: fontWeight, flex: 2, align: "end" }
    ]
  };
}

function pushLineMessage(messages) {
  const url = "https://api.line.me/v2/bot/message/push";
  UrlFetchApp.fetch(url, {
    method: "post",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + CONFIG.LINE_CHANNEL_ACCESS_TOKEN },
    payload: JSON.stringify({ to: CONFIG.LINE_USER_ID, messages: messages })
  });
}


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
