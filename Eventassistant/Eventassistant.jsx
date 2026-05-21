import { useState, useRef } from "react";

const MATERIAL_TYPES = [
  { id: "poster", label: "海報文字" },
  { id: "announcement", label: "網站公告" },
  { id: "email", label: "Email 通知" },
  { id: "registration", label: "報名頁說明" },
  { id: "reminder", label: "活動前提醒" },
  { id: "recap", label: "活動後成果紀錄" },
  { id: "aiPrompt", label: "AI 海報生成指令" },
];

const TONES = ["正式", "活潑", "簡潔", "專業", "吸引學生", "商務感"];
const LENGTHS = ["無", "短版", "中版", "長版"];
const WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];

const POSTER_SIZES = [
  "A1 直式（594 × 841 mm）",
  "A1 橫式（841 × 594 mm）",
  "550 × 800 mm 直式",
  "800 × 550 mm 橫式",
];

const POSTER_STYLES = [
  "正式簡約", "青春活潑", "科技感", "商務專業", "文青風", "學術講座風",
  "極簡留白", "雜誌封面風", "復古印刷風", "國際會議風", "台灣在地感",
  "節慶喜氣", "藝術展覽風", "運動能量感", "插畫手繪風", "暗黑質感風",
  "日系清新風", "親子友善風",
];

const COLOR_SCHEMES = [
  { id: "unspecified", label: "不指定" },
  { id: "red",        label: "紅色系" },
  { id: "blue",       label: "藍色系" },
  { id: "blackgold",  label: "黑金色系" },
  { id: "morandi",    label: "莫蘭迪色系" },
  { id: "techcool",   label: "科技冷色調" },
  { id: "green",      label: "綠色系" },
  { id: "purple",     label: "紫色系" },
  { id: "orange",     label: "橙色系" },
  { id: "pinkrose",   label: "玫瑰粉系" },
  { id: "teal",       label: "青藍色系" },
  { id: "cream",      label: "米白暖色系" },
  { id: "mono",       label: "黑白灰階" },
  { id: "custom",     label: "自訂色系" },
];

// POSTER_FIELDS: 移除活動主題
const POSTER_FIELDS = [
  { id: "pf_name",        label: "活動名稱／講題", formKey: "name" },
  { id: "pf_subtitle",    label: "副標題",          formKey: "subtitle" },
  { id: "pf_speaker",     label: "講者姓名",        formKey: "speaker" },
  { id: "pf_speakerTitle",label: "講者職稱／經歷",  formKey: "speakerTitle" },
  { id: "pf_date",        label: "日期",            formKey: "date" },
  { id: "pf_time",        label: "時間",            formKey: null },
  { id: "pf_location",    label: "地點",            formKey: "location" },
  { id: "pf_organizer",   label: "主辦單位",        formKey: "organizer" },
  { id: "pf_coorganizer", label: "協辦單位",        formKey: "coorganizer" },
  { id: "pf_reg",         label: "報名方式",        formKey: "regInfo" },
  { id: "pf_deadline",    label: "報名截止日",      formKey: "deadline" },
  { id: "pf_contact",     label: "聯絡資訊",        formKey: "contact" },
  { id: "pf_highlights",  label: "活動亮點",        formKey: "highlights" },
  { id: "pf_audience",    label: "適合對象",        formKey: "audience" },
  { id: "pf_notes",       label: "備註",            formKey: "notes" },
  { id: "pf_qr",          label: "QR Code 位置預留",formKey: null },
  { id: "pf_logo",        label: "Logo 位置預留",   formKey: null },
];

const defaultForm = {
  name: "", subtitle: "", purpose: "", highlights: "",
  speaker: "", speakerTitle: "", date: "", location: "", locationIsRoom: true,
  audience: "", organizer: "", coorganizer: "", regInfo: "",
  deadlineDate: "", contact: "", notes: "",
};

// 根據已填欄位動態算出海報欄位的預設勾選
function computePosterFields(form, startTime) {
  const hasTime = !!startTime;
  const result = {};
  POSTER_FIELDS.forEach(f => {
    if (f.id === "pf_time") { result[f.id] = hasTime; return; }
    if (f.id === "pf_qr" || f.id === "pf_logo") { result[f.id] = false; return; }
    if (f.formKey) { result[f.id] = !!form[f.formKey]; return; }
    result[f.id] = false;
  });
  return result;
}

const defaultPosterSettings = {
  size: POSTER_SIZES[0],
  style: POSTER_STYLES[0],
  colorSchemes: ["unspecified"],
  fields: Object.fromEntries(POSTER_FIELDS.map(f => [f.id, false])),
};

// ── 日期格式化工具 ──────────────────────────────────────────
// 加入西元年顯示
function formatDateZh(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  const yr = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const wd = WEEKDAYS_ZH[d.getDay()];
  return `${yr}/${m}/${day}（${wd}）`;
}

function formatTimeRange(startTime, endTime) {
  if (!startTime) return "";
  return endTime ? `${startTime}–${endTime}` : startTime;
}

// 地點顯示：若勾選「教室」則加上「教室」後綴
function formatLocation(location, isRoom) {
  if (!location) return "";
  return isRoom ? `${location} 教室` : location;
}

// ── 自由格式解析 ──────────────────────────────────────────
function parseFreeText(text) {
  const result = {};
  const timeLineMatch = text.match(/時間[：:]\s*(.+)/);
  if (timeLineMatch) {
    const raw = timeLineMatch[1].trim();
    const dateInTime = raw.match(/(\d{1,2})\/(\d{1,2})(?:[（(][^）)]+[）)])?/);
    if (dateInTime) {
      const yr = new Date().getFullYear();
      result.date = `${yr}-${dateInTime[1].padStart(2,"0")}-${dateInTime[2].padStart(2,"0")}`;
    }
    const timeRange = raw.match(/(\d{1,2}:\d{2})\s*[-–~～]\s*(\d{1,2}:\d{2})/);
    if (timeRange) { result.startTime = timeRange[1]; result.endTime = timeRange[2]; }
    else { const st = raw.match(/(\d{1,2}:\d{2})/); if (st) result.startTime = st[1]; }
  }
  const dateLine = text.match(/日期[：:]\s*(\d{4})?[\/\-]?(\d{1,2})[\/\-](\d{1,2})/);
  if (dateLine && !result.date) {
    const yr = dateLine[1] || new Date().getFullYear();
    result.date = `${yr}-${dateLine[2].padStart(2,"0")}-${dateLine[3].padStart(2,"0")}`;
  }
  const topicMatch = text.match(/(?:講題|題目|活動名稱)[：:]\s*(.+)/);
  if (topicMatch) result.name = topicMatch[1].trim();
  const speakerLine = text.match(/(?:講者|主講人|演講者)[：:]\s*(.+)/);
  if (speakerLine) {
    const raw = speakerLine[1].trim();
    const parts = raw.split(/\s+/);
    if (parts.length >= 3) {
      const nameIdx = parts.findIndex((p, i) => i > 0 && /^[\u4e00-\u9fa5]{2,4}$/.test(p));
      if (nameIdx > 0) {
        result.speaker = parts[nameIdx];
        result.speakerTitle = [...parts.slice(0, nameIdx), ...parts.slice(nameIdx + 1)].join(" ");
      } else { result.speaker = raw; }
    } else if (parts.length === 2) { result.speaker = parts[0]; result.speakerTitle = parts[1]; }
    else { result.speaker = raw; }
  }
  const locationMatch = text.match(/(?:地點|地址|場地)[：:]\s*(.+)/);
  if (locationMatch) result.location = locationMatch[1].trim();
  const organizerMatch = text.match(/(?:主辦單位|主辦)[：:]\s*(.+)/);
  if (organizerMatch) result.organizer = organizerMatch[1].trim();
  const regMatch = text.match(/(?:報名|報名方式|報名連結)[：:]\s*(.+)/);
  if (regMatch) result.regInfo = regMatch[1].trim();
  const audienceMatch = text.match(/(?:對象|活動對象|適合對象)[：:]\s*(.+)/);
  if (audienceMatch) result.audience = audienceMatch[1].trim();
  return result;
}

// ── 文案生成函式 ──────────────────────────────────────────
function generatePoster(form, tone, length) {
  const infoOnly = length === "無";
  const short = length === "短版";
  const long = length === "長版";
  const lively = !infoOnly && (tone === "活潑" || tone === "吸引學生");
  const cta = lively ? "🎉 立即報名，名額有限！" : "歡迎踴躍報名參加";
  const intro = lively ? `✨ ${form.name || "精彩活動"} ✨` : `【${form.name || "活動名稱"}】`;
  let lines = [intro];
  if (form.subtitle) lines.push(form.subtitle);
  if (form.speaker) lines.push(`主講人：${form.speaker}${form.speakerTitle ? `｜${form.speakerTitle}` : ""}`);
  lines.push(`📅 日期：${form.date || "（請填寫日期）"}`);
  lines.push(`⏰ 時間：${form.time || "（請填寫時間）"}`);
  lines.push(`📍 地點：${form.location || "（請填寫地點）"}`);
  if (!infoOnly && !short && form.audience) lines.push(`適合對象：${form.audience}`);
  if (!infoOnly && long && form.highlights) lines.push(`活動亮點：${form.highlights}`);
  if (form.regInfo) lines.push(`報名方式：${form.regInfo}`);
  if (form.deadline) lines.push(`報名截止：${form.deadline}`);
  if (form.organizer) lines.push(`主辦單位：${form.organizer}`);
  if (!infoOnly && !short && form.coorganizer) lines.push(`協辦單位：${form.coorganizer}`);
  if (form.contact) lines.push(`聯絡資訊：${form.contact}`);
  if (!infoOnly) lines.push(cta);
  return lines.join("\n");
}

function generateAnnouncement(form, tone, length) {
  const infoOnly = length === "無";
  const formal = infoOnly || tone === "正式" || tone === "專業" || tone === "商務感";
  const long = length === "長版";
  const short = length === "短版" || infoOnly;
  let text = `${form.organizer || "本單位"}公告\n\n`;
  text += formal
    ? `茲訂於 ${form.date || "（日期）"} 辦理「${form.name || "活動名稱"}」，謹此公告相關資訊如下：\n\n`
    : `我們將於 ${form.date || "（日期）"} 舉辦「${form.name || "活動名稱"}」，歡迎大家踴躍參加！\n\n`;
  if (form.subtitle) text += `副標題：${form.subtitle}\n`;
  if (!short && form.purpose) text += `活動目的：${form.purpose}\n`;
  if (form.speaker) text += `主講人：${form.speaker}${form.speakerTitle ? `（${form.speakerTitle}）` : ""}\n`;
  text += `活動日期：${form.date || "—"}\n`;
  text += `活動時間：${form.time || "—"}\n`;
  text += `活動地點：${form.location || "—"}\n`;
  if (!infoOnly && form.audience) text += `活動對象：${form.audience}\n`;
  if (form.regInfo) text += `報名方式：${form.regInfo}\n`;
  if (form.deadline) text += `報名截止：${form.deadline}\n`;
  if (form.contact) text += `聯絡資訊：${form.contact}\n`;
  if (long && form.highlights) text += `\n活動亮點\n${form.highlights}\n`;
  if (long && form.notes) text += `\n備註\n${form.notes}\n`;
  if (!infoOnly) text += `\n如有任何疑問，請洽 ${form.contact || "主辦單位"}。`;
  return text;
}

function generateEmail(form, tone, length) {
  const infoOnly = length === "無";
  const lively = !infoOnly && (tone === "活潑" || tone === "吸引學生");
  const long = length === "長版";
  const short = length === "短版" || infoOnly;
  let subj = `【活動通知】${form.name || "精彩活動即將登場"}`;
  if (form.date) subj += ` ｜ ${form.date}`;
  let body = `主旨：${subj}\n\n`;
  body += lively ? "親愛的朋友，\n\n" : "您好，\n\n";
  body += lively
    ? `誠摯邀請您參加由 ${form.organizer || "本單位"} 主辦的「${form.name || "活動名稱"}」，期待與您共同創造精彩！\n\n`
    : `${form.organizer || "本單位"} 誠摯邀請您出席「${form.name || "活動名稱"}」活動，詳細資訊如下：\n\n`;
  if (!short && form.purpose) body += `【活動目的】\n${form.purpose}\n\n`;
  if (!short && form.highlights) body += `【活動亮點】\n${form.highlights}\n\n`;
  body += `【活動資訊】\n`;
  if (form.speaker) body += `主講人：${form.speaker}${form.speakerTitle ? `（${form.speakerTitle}）` : ""}\n`;
  body += `日期：${form.date || "—"}\n`;
  body += `時間：${form.time || "—"}\n`;
  body += `地點：${form.location || "—"}\n`;
  if (!infoOnly && form.audience) body += `對象：${form.audience}\n`;
  body += "\n";
  if (form.regInfo || form.deadline) {
    body += `【報名資訊】\n`;
    if (form.regInfo) body += `報名方式：${form.regInfo}\n`;
    if (form.deadline) body += `報名截止：${form.deadline}\n`;
    body += "\n";
  }
  if (long && form.notes) body += `【備註】\n${form.notes}\n\n`;
  if (!infoOnly) body += lively
    ? `名額有限，歡迎把握機會報名！如有任何問題，歡迎洽詢 ${form.contact || "主辦單位"}。\n\n期待與您相見！\n\n${form.organizer || "主辦單位"} 敬上`
    : `如有任何問題，請洽 ${form.contact || "主辦單位"}。\n\n敬請撥冗蒞臨，謝謝您的支持。\n\n${form.organizer || "主辦單位"} 敬上`;
  return body;
}

function generateRegistration(form, tone, length) {
  const infoOnly = length === "無";
  const long = length === "長版";
  const short = length === "短版" || infoOnly;
  let text = `${form.name || "活動名稱"}\n`;
  if (form.subtitle) text += `${form.subtitle}\n`;
  text += `${"─".repeat(30)}\n\n`;
  if (!short && form.purpose) text += `【活動簡介】\n${form.purpose}\n\n`;
  if (!short && form.highlights) text += `【活動亮點】\n${form.highlights}\n\n`;
  text += `【活動資訊】\n`;
  if (form.speaker) text += `主講人：${form.speaker}${form.speakerTitle ? `（${form.speakerTitle}）` : ""}\n`;
  text += `日期：${form.date || "—"}\n`;
  text += `時間：${form.time || "—"}\n`;
  text += `地點：${form.location || "—"}\n`;
  if (!infoOnly && form.audience) text += `適合對象：${form.audience}\n`;
  if (form.deadline) text += `報名截止：${form.deadline}\n`;
  if (form.organizer) text += `主辦單位：${form.organizer}\n`;
  if (!short && form.coorganizer) text += `協辦單位：${form.coorganizer}\n`;
  if (long && form.notes) text += `\n【注意事項】\n${form.notes}\n`;
  if (!infoOnly) text += `\n如有疑問，請洽：${form.contact || "主辦單位"}`;
  return text;
}

function generateReminder(form, tone, length) {
  const infoOnly = length === "無";
  const lively = !infoOnly && (tone === "活潑" || tone === "吸引學生");
  const short = length === "短版" || infoOnly;
  let text = lively
    ? `📣 活動提醒｜「${form.name || "活動"}」明天/今天登場！\n\n`
    : `【活動提醒】「${form.name || "活動名稱"}」即將舉行\n\n`;
  text += `請確認以下資訊：\n`;
  text += `📅 日期：${form.date || "—"}\n`;
  text += `⏰ 時間：${form.time || "—"}\n`;
  text += `📍 地點：${form.location || "—"}\n`;
  if (!short && form.speaker) text += `🎤 主講人：${form.speaker}\n`;
  if (!short && form.regInfo) text += `\n報名連結：${form.regInfo}\n`;
  if (!infoOnly && form.contact) text += `\n如有臨時問題，請洽：${form.contact}\n`;
  if (!infoOnly) text += lively
    ? `\n期待您的到來！一起來創造美好回憶 🎉`
    : `\n敬請準時出席，期待與您相見。\n\n${form.organizer || "主辦單位"} 敬上`;
  return text;
}

function generateRecap(form, tone, length) {
  const infoOnly = length === "無";
  const long = length === "長版";
  const short = length === "短版" || infoOnly;
  let text = `【活動成果紀錄】${form.name || "活動名稱"}\n\n`;
  text += `${form.organizer || "本單位"}於 ${form.date || "（日期）"} 圓滿舉辦「${form.name || "活動名稱"}」，`;
  if (form.location) text += `活動於 ${form.location} 順利進行，`;
  text += `感謝所有與會者的熱情參與。\n\n`;
  if (!short) {
    if (form.purpose) text += `本次活動以「${form.purpose}」為主軸，深獲與會者好評。\n\n`;
    if (form.speaker) text += `主講人 ${form.speaker}${form.speakerTitle ? `（${form.speakerTitle}）` : ""}，以精彩的內容帶領與會者深入探討相關議題，獲得熱烈迴響。\n\n`;
  }
  if (long && form.highlights) text += `【活動亮點】\n${form.highlights}\n\n`;
  text += `感謝 ${form.organizer || "主辦單位"}`;
  if (form.coorganizer) text += `及協辦單位 ${form.coorganizer}`;
  text += ` 的共同努力，使本次活動順利成功。\n`;
  if (!short) text += `\n期待未來持續推動更多優質活動，歡迎持續關注相關訊息。`;
  return text;
}

function generateAIPrompt(form, settings, length) {
  const fields = POSTER_FIELDS.filter(f => settings.fields[f.id]).map(f => f.label);
  const long = length === "長版";
  let prompt = `請幫我生成一張高品質活動海報，以下是詳細需求：\n\n`;
  prompt += `【海報尺寸】\n${settings.size}，高解析度，可列印輸出\n\n`;
  prompt += `【設計風格】\n${settings.style}\n\n`;
  const selectedColors = COLOR_SCHEMES.filter(c =>
    (settings.colorSchemes || []).includes(c.id) && c.id !== "unspecified"
  );
  if (selectedColors.length > 0) {
    prompt += `【色彩方案】\n`;
    selectedColors.forEach(c => prompt += `- ${c.label}\n`);
    prompt += "\n";
  }
  prompt += `【海報內容】\n需在海報上顯示以下資訊：\n`;
  fields.forEach(f => prompt += `- ${f}\n`);
  prompt += `\n【活動資料】\n`;
  if (form.name) prompt += `講題：${form.name}\n`;
  if (form.subtitle) prompt += `副標題：${form.subtitle}\n`;
  if (form.speaker) {
    prompt += `主講人：${form.speaker}`;
    if (form.speakerTitle) prompt += `，${form.speakerTitle}`;
    prompt += "\n";
  }
  if (form.date) prompt += `日期：${form.date}\n`;
  if (form.time) prompt += `時間：${form.time}\n`;
  if (form.location) prompt += `地點：${form.location}\n`;
  if (form.organizer) prompt += `主辦單位：${form.organizer}\n`;
  if (form.coorganizer) prompt += `協辦單位：${form.coorganizer}\n`;
  if (form.regInfo) prompt += `報名方式：${form.regInfo}\n`;
  if (form.deadline) prompt += `報名截止：${form.deadline}\n`;
  if (form.contact) prompt += `聯絡資訊：${form.contact}\n`;
  if (form.highlights) prompt += `活動亮點：${form.highlights}\n`;
  prompt += `\n【版面配置要求】\n`;
  prompt += `- 講題放置於海報上方 1/3 區域，字體醒目\n`;
  prompt += `- 講者資訊配置於中間區域，可附上講者照片預留空間\n`;
  prompt += `- 活動資訊（時間、地點）清楚列出\n`;
  if (settings.fields["pf_logo"]) prompt += `- 左上角或左下角預留 Logo 放置區域（約 120×60px）\n`;
  if (settings.fields["pf_qr"]) prompt += `- 右下角預留 QR Code 區域（約 100×100px）\n`;
  if (long) {
    prompt += `\n【輸出要求】\n`;
    prompt += `- 解析度：300 DPI 以上\n`;
    prompt += `- 色彩模式：RGB（螢幕使用）或 CMYK（印刷使用）\n`;
    prompt += `- 格式：PNG 或 PDF\n`;
    prompt += `- 確保文字清晰可讀，視覺層次分明\n`;
    prompt += `- 整體版面平衡，具有視覺吸引力\n`;
  }
  return prompt;
}

function generateAll(form, selectedTypes, tone, length, posterSettings) {
  const generators = {
    poster: () => generatePoster(form, tone, length),
    announcement: () => generateAnnouncement(form, tone, length),
    email: () => generateEmail(form, tone, length),
    registration: () => generateRegistration(form, tone, length),
    reminder: () => generateReminder(form, tone, length),
    recap: () => generateRecap(form, tone, length),
    aiPrompt: () => generateAIPrompt(form, posterSettings, length),
  };
  const result = {};
  selectedTypes.forEach(t => { result[t] = generators[t]?.() || ""; });
  return result;
}

// ── 小元件 ──────────────────────────────────────────────
function InputField({ label, id, value, onChange, placeholder, multiline, required }) {
  const cls = "w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-slate-50/60 focus:bg-white text-slate-800 placeholder-slate-400 resize-none transition-colors";
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-500">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {multiline
        ? <textarea id={id} rows={3} className={cls} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <input id={id} type="text" className={cls} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  );
}

// ── 日曆元件 ─────────────────────────────────────────────
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DatePicker({ label, value, onChange, hideLabel = false, placeholder = "選擇日期" }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const current = value ? new Date(value + "T00:00:00") : today;
  const [viewYear, setViewYear] = useState(current.getFullYear());
  const [viewMonth, setViewMonth] = useState(current.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedDate = value ? new Date(value + "T00:00:00") : null;
  const isSelected = (d) => selectedDate &&
    selectedDate.getFullYear() === viewYear &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getDate() === d;
  const isToday = (d) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;

  const selectDate = (d) => {
    const m = String(viewMonth + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    onChange(`${viewYear}-${m}-${dd}`);
    setOpen(false);
  };
  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

  const displayValue = value ? formatDateZh(value) : "";

  return (
    <div className="flex flex-col gap-1 relative">
      {!hideLabel && <label className="text-xs font-medium text-slate-500">{label || "活動日期"}</label>}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 flex items-center justify-between transition-colors hover:border-amber-300">
        <span className={displayValue ? "text-slate-800" : "text-slate-400"}>{displayValue || placeholder}</span>
        <span className="text-amber-500"><CalendarIcon /></span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-amber-100 rounded-lg shadow-xl p-3 w-72">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 hover:bg-amber-50 rounded-md text-slate-500 text-sm">◀</button>
            <span className="text-sm font-semibold text-slate-700">{viewYear} 年 {viewMonth + 1} 月</span>
            <button onClick={nextMonth} className="p-1 hover:bg-amber-50 rounded-md text-slate-500 text-sm">▶</button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {["日","一","二","三","四","五","六"].map(w => (
              <div key={w} className="text-center text-xs text-slate-400 py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => (
              <div key={i}>
                {d === null ? <div /> : (
                  <button onClick={() => selectDate(d)}
                    className={`w-full aspect-square rounded-md text-xs font-medium transition-colors
                      ${isSelected(d) ? "bg-amber-500 text-white" :
                        isToday(d) ? "bg-sky-50 text-sky-700 border border-sky-200" :
                        "hover:bg-amber-50 text-slate-700"}`}>
                    {d}
                  </button>
                )}
              </div>
            ))}
          </div>
          {value && (
            <button onClick={() => { onChange(""); setOpen(false); }}
              className="mt-2 w-full text-xs text-slate-400 hover:text-slate-600 py-1">清除日期</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── 時間選擇器 ───────────────────────────────────────────
function TimePicker({ label, startTime, endTime, onChangeStart, onChangeEnd, showEnd = true, compact = false, startLabel = "開始" }) {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const mins = ["00", "10", "20", "30", "40", "50"];

  const TimeSelect = ({ value, onChange, placeholder }) => {
    const [h, m] = value ? value.split(":") : ["", ""];
    return (
      <div className="flex gap-1 flex-1">
        <select value={h || ""} onChange={e => onChange(e.target.value && (m || "00") ? `${e.target.value}:${m || "00"}` : "")}
          className="flex-1 border border-slate-200 rounded-md px-2 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 hover:border-amber-300">
          <option value="">時</option>
          {hours.map(hh => <option key={hh} value={hh}>{hh}</option>)}
        </select>
        <span className="self-center text-slate-400 text-sm">:</span>
        <select value={m || ""} onChange={e => onChange(h && e.target.value ? `${h}:${e.target.value}` : "")}
          className="flex-1 border border-slate-200 rounded-md px-2 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 hover:border-amber-300">
          <option value="">分</option>
          {mins.map(mm => <option key={mm} value={mm}>{mm}</option>)}
        </select>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      {label !== null && <label className="text-xs font-medium text-slate-500">{label || "活動時間"}</label>}
      <div className="flex gap-2 items-center">
        <div className="flex flex-col gap-0.5 flex-1">
          {!compact && <span className="text-xs text-slate-400">{startLabel}</span>}
          <TimeSelect value={startTime} onChange={onChangeStart} />
        </div>
        {showEnd && <>
          <span className="text-slate-400 text-sm mt-4">–</span>
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-xs text-slate-400">結束（選填）</span>
            <TimeSelect value={endTime} onChange={onChangeEnd} />
          </div>
        </>}
      </div>
      {(startTime || endTime) && (
        <p className="text-xs text-sky-600 mt-0.5">時間：{formatTimeRange(startTime, endTime)}</p>
      )}
    </div>
  );
}

// ── 自由輸入解析器 ────────────────────────────────────────
function FreeTextParser({ onApply }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [applied, setApplied] = useState(false);

  const FIELD_LABELS = {
    name: "活動名稱", date: "日期", startTime: "開始時間", endTime: "結束時間",
    speaker: "講者姓名", speakerTitle: "講者職稱", location: "地點",
    organizer: "主辦單位", regInfo: "報名方式", audience: "對象",
  };

  const handleParse = () => { setParsed(parseFreeText(text)); setApplied(false); };
  const handleApply = () => { onApply(parsed); setApplied(true); };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-500 leading-relaxed">
        貼上任意格式的活動公告，系統自動解析並填入欄位。<br />
        例如：<span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">時間：12/17（三）14:00-15:30</span>
      </p>
      <textarea rows={5}
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-slate-50/60 text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 font-mono transition-colors"
        placeholder={"時間：12/17（三）14:00-15:30\n講題：石油期貨價格與情緒指數\n講者：銘傳大學金融學系 張雅婷 助理教授\n地點：商學院 301 教室"}
        value={text} onChange={e => { setText(e.target.value); setParsed(null); setApplied(false); }} />
      <button onClick={handleParse} disabled={!text.trim()}
        className="self-start text-sm px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">
        ✦ 解析內容
      </button>
      {parsed && Object.keys(parsed).length > 0 && (
        <div className="border border-sky-100 rounded-md bg-sky-50 p-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-sky-700 mb-1">解析結果預覽</p>
          {Object.entries(parsed).map(([k, v]) => v ? (
            <div key={k} className="flex gap-2 text-xs">
              <span className="text-slate-500 w-20 shrink-0">{FIELD_LABELS[k] || k}</span>
              <span className="text-slate-800 font-medium">{v}</span>
            </div>
          ) : null)}
          <button onClick={handleApply}
            className={`mt-1 self-start text-sm px-4 py-1.5 rounded-md border transition-colors ${applied ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-sky-300 text-sky-700 hover:bg-sky-100"}`}>
            {applied ? "✓ 已填入欄位" : "填入表單欄位"}
          </button>
        </div>
      )}
      {parsed && Object.keys(parsed).length === 0 && (
        <p className="text-xs text-amber-600">未能解析出任何欄位，請確認格式（如「時間：」、「講者：」、「地點：」）</p>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white/95 border border-white rounded-lg p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-sm font-semibold text-slate-800 mb-4 pb-3 border-b border-amber-100">{title}</h2>
      {children}
    </section>
  );
}

function ResultCard({ label, content, onCopy, onRegen, copied }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-md">{label}</span>
        <div className="flex gap-2">
          <button onClick={onRegen} className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">↺ 重新產生</button>
          <button onClick={onCopy} className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${copied ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-sky-200 text-sky-700 hover:bg-sky-50"}`}>
            {copied ? "✓ 已複製" : "⧉ 複製"}
          </button>
        </div>
      </div>
      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 rounded-md p-4 max-h-80 overflow-y-auto border border-slate-100">
        {content}
      </pre>
    </div>
  );
}

// ── 主元件 ───────────────────────────────────────────────
export default function EventAssistant() {
  const [form, setForm] = useState(defaultForm);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [deadlineStartTime, setDeadlineStartTime] = useState("");
  const [selectedTypes, setSelectedTypes] = useState(["poster", "email", "aiPrompt"]);
  const [tone, setTone] = useState("正式");
  const [length, setLength] = useState("中版");
  const [posterSettings, setPosterSettings] = useState(defaultPosterSettings);
  const [results, setResults] = useState({});
  const [copied, setCopied] = useState({});
  const [showPosterSettings, setShowPosterSettings] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generatingPurpose, setGeneratingPurpose] = useState(false);

  const setField = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  // 地點完整顯示
  const locationDisplay = formatLocation(form.location, form.locationIsRoom);

  // 報名截止顯示
  const deadlineDisplay = form.deadlineDate
    ? (deadlineStartTime
        ? `${formatDateZh(form.deadlineDate)} ${deadlineStartTime} 前`
        : formatDateZh(form.deadlineDate))
    : "";

  const effectiveForm = {
    ...form,
    date: form.date ? formatDateZh(form.date) : "",
    time: formatTimeRange(startTime, endTime),
    location: locationDisplay,
    deadline: deadlineDisplay,
  };

  const toggleType = (id) => setSelectedTypes(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const togglePosterField = (id) => setPosterSettings(s => ({
    ...s, fields: { ...s.fields, [id]: !s.fields[id] }
  }));

  // 自動根據已填欄位更新海報欄位勾選
  const syncPosterFields = () => {
    setPosterSettings(s => ({
      ...s,
      fields: computePosterFields(form, startTime),
    }));
  };

  const handleApplyParsed = (parsed) => {
    const updates = {};
    if (parsed.name) updates.name = parsed.name;
    if (parsed.speaker) updates.speaker = parsed.speaker;
    if (parsed.speakerTitle) updates.speakerTitle = parsed.speakerTitle;
    if (parsed.location) updates.location = parsed.location;
    if (parsed.organizer) updates.organizer = parsed.organizer;
    if (parsed.regInfo) updates.regInfo = parsed.regInfo;
    if (parsed.audience) updates.audience = parsed.audience;
    if (Object.keys(updates).length) setForm(f => ({ ...f, ...updates }));
    if (parsed.date) setField("date")(parsed.date);
    if (parsed.startTime) setStartTime(parsed.startTime);
    if (parsed.endTime) setEndTime(parsed.endTime);
  };

  // 自動產生活動目的
  const handleAutoGeneratePurpose = () => {
    if (generatingPurpose) return;
    setGeneratingPurpose(true);
    const name = form.name || "本活動";
    const speaker = form.speaker || "";
    const speakerTitle = form.speakerTitle || "";
    const audience = form.audience || "參與者";
    const speakerStr = speaker
      ? `，由${speakerTitle ? speakerTitle + " " : ""}${speaker}主講，`
      : "，";
    const purpose = `本次「${name}」${speakerStr}旨在提升${audience}對相關議題的認識與理解，透過深度分享與交流，促進知識傳遞與實務應用，期望參與者能從中獲得啟發，拓展視野並建立跨領域連結。`;
    setTimeout(() => {
      setField("purpose")(purpose);
      setGeneratingPurpose(false);
    }, 400);
  };

  const handleGenerate = () => {
    setResults(generateAll(effectiveForm, selectedTypes, tone, length, posterSettings));
    setGenerated(true);
    setTimeout(() => {
      document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleRegen = (type) => {
    setResults(prev => ({
      ...prev,
      [type]: generateAll(effectiveForm, [type], tone, length, posterSettings)[type],
    }));
  };

  const handleCopy = (type) => {
    navigator.clipboard.writeText(results[type] || "");
    setCopied(prev => ({ ...prev, [type]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [type]: false })), 2000);
  };

  const handleClear = () => {
    setForm(defaultForm);
    setStartTime(""); setEndTime(""); setDeadlineStartTime("");
    setResults({}); setGenerated(false);
  };

  const infoOnly = length === "無";

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f0f9ff_0%,#fff7ed_48%,#f0fdfa_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">

        {/* Header */}
        <div className="flex flex-col gap-3 rounded-lg border border-white/70 bg-white/75 px-5 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Event Assistant</p>
            <h1 className="text-2xl font-bold text-slate-900">活動輔助整理</h1>
            <p className="mt-2 text-sm text-slate-500">輸入活動資訊，一次整理海報、公告、Email、報名頁與 AI 海報生成指令</p>
          </div>
          <div className="flex gap-2 text-xs text-slate-500">
            <span className="rounded-md border border-sky-100 bg-sky-50 px-2.5 py-1 text-sky-700">文案產出</span>
            <span className="rounded-md border border-teal-100 bg-teal-50 px-2.5 py-1 text-teal-700">海報提示詞</span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <main className="flex flex-col gap-5">

        {/* Form */}
        <Section title="活動基本資料">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="活動名稱 / 講題" id="name" value={form.name} onChange={setField("name")} placeholder="例：石油期貨價格與情緒指數" required />
            <InputField label="活動副標題" id="subtitle" value={form.subtitle} onChange={setField("subtitle")} placeholder="例：迎向 AI 新時代" />
            <InputField label="活動對象" id="audience" value={form.audience} onChange={setField("audience")} placeholder="例：大專院校師生、業界人士" />
            <InputField label="主辦單位" id="organizer" value={form.organizer} onChange={setField("organizer")} placeholder="例：資訊工程學系" />
            <InputField label="講者姓名" id="speaker" value={form.speaker} onChange={setField("speaker")} placeholder="例：張雅婷" />
            <InputField label="講者職稱／經歷" id="speakerTitle" value={form.speakerTitle} onChange={setField("speakerTitle")} placeholder="例：銘傳大學金融學系 助理教授" />

            {/* 日期 */}
            <DatePicker label="活動日期" value={form.date} onChange={setField("date")} />

            {/* 時間 — 跨兩欄 */}
            <div className="sm:col-span-2">
              <TimePicker startTime={startTime} endTime={endTime} onChangeStart={setStartTime} onChangeEnd={setEndTime} />
            </div>

            {/* 地點 + 教室勾選 */}
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">活動地點</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-slate-50/60 focus:bg-white text-slate-800 placeholder-slate-400 transition-colors"
                  value={form.location}
                  onChange={e => setField("location")(e.target.value)}
                  placeholder={form.locationIsRoom ? "例：2515（自動補「教室」）" : "例：台灣大學霖澤館 101 室"}
                />
                <label className="flex items-center gap-1.5 text-sm text-slate-600 whitespace-nowrap cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.locationIsRoom}
                    onChange={e => setField("locationIsRoom")(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-300"
                  />
                  教室
                </label>
              </div>
              {form.location && (
                <p className="text-xs text-sky-600">顯示為：{locationDisplay}</p>
              )}
            </div>

            <InputField label="協辦單位" id="coorganizer" value={form.coorganizer} onChange={setField("coorganizer")} placeholder="例：創新育成中心" />

            {/* 報名截止：日期 + 時間 */}
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">報名截止</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
                <DatePicker
                  hideLabel
                  placeholder="選擇截止日期"
                  value={form.deadlineDate}
                  onChange={setField("deadlineDate")}
                />
                <TimePicker
                  label={null}
                  compact
                  startTime={deadlineStartTime}
                  endTime=""
                  onChangeStart={setDeadlineStartTime}
                  onChangeEnd={() => {}}
                  showEnd={false}
                />
              </div>
              {deadlineDisplay && (
                <p className="text-xs text-sky-600">截止：{deadlineDisplay}</p>
              )}
            </div>

            <InputField label="聯絡資訊" id="contact" value={form.contact} onChange={setField("contact")} placeholder="例：林小姐 02-1234-5678 / event@school.edu.tw" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            {/* 活動目的 + 自動產生 */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">活動目的</label>
                <button
                  onClick={handleAutoGeneratePurpose}
                  disabled={generatingPurpose}
                  className="text-xs px-3 py-1 rounded-md border border-sky-200 text-sky-700 hover:bg-sky-50 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {generatingPurpose ? "⏳ 產生中…" : "✦ 自動產生"}
                </button>
              </div>
              <textarea
                id="purpose" rows={3}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-slate-50/60 focus:bg-white text-slate-800 placeholder-slate-400 resize-none transition-colors"
                value={form.purpose}
                onChange={e => setField("purpose")(e.target.value)}
                placeholder="說明本次活動的目標與意義…（或點右上「自動產生」）"
              />
            </div>

            <InputField label="活動亮點" id="highlights" value={form.highlights} onChange={setField("highlights")} placeholder="例：業界專家分享、互動工作坊、證書頒發…" multiline />
            <InputField label="報名方式／報名連結" id="regInfo" value={form.regInfo} onChange={setField("regInfo")} placeholder="例：請至 https://forms.gle/... 填寫報名表" multiline />
            <InputField label="備註" id="notes" value={form.notes} onChange={setField("notes")} placeholder="其他注意事項…" multiline />
          </div>
        </Section>

        {/* Poster Settings */}
        {selectedTypes.includes("aiPrompt") && (
          <Section title="AI 海報生成指令設定">
            <button onClick={() => setShowPosterSettings(v => !v)}
              className="text-sm text-sky-700 underline underline-offset-2 mb-3">
              {showPosterSettings ? "收起設定" : "展開設定"}
            </button>
            {showPosterSettings && (
              <div className="flex flex-col gap-5 mt-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">海報尺寸</p>
                  <div className="flex flex-wrap gap-2">
                    {POSTER_SIZES.map(s => (
                      <button key={s} onClick={() => setPosterSettings(p => ({ ...p, size: s }))}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-all ${posterSettings.size === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">海報風格 <span className="text-slate-400 font-normal">（單選）</span></p>
                  <div className="flex flex-wrap gap-2">
                    {POSTER_STYLES.map(s => (
                      <button key={s} onClick={() => setPosterSettings(p => ({ ...p, style: s }))}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-all ${posterSettings.style === s ? "bg-sky-700 text-white border-sky-700" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    色系 <span className="text-slate-400 font-normal">（可複選）</span>
                    {posterSettings.colorSchemes.length > 0 && !posterSettings.colorSchemes.includes("unspecified") && (
                      <button onClick={() => setPosterSettings(p => ({ ...p, colorSchemes: ["unspecified"] }))}
                        className="ml-2 text-amber-600 hover:text-amber-700 text-xs">清除</button>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_SCHEMES.map(c => {
                      const active = posterSettings.colorSchemes.includes(c.id);
                      return (
                        <button key={c.id}
                          onClick={() => {
                            if (c.id === "unspecified") {
                              setPosterSettings(p => ({ ...p, colorSchemes: ["unspecified"] }));
                            } else {
                              setPosterSettings(p => {
                                const next = active
                                  ? p.colorSchemes.filter(x => x !== c.id)
                                  : [...p.colorSchemes.filter(x => x !== "unspecified"), c.id];
                                return { ...p, colorSchemes: next.length ? next : ["unspecified"] };
                              });
                            }
                          }}
                          className={`text-xs px-3 py-1.5 rounded-md border transition-all ${active ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"}`}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-medium text-slate-500">顯示於海報的欄位</p>
                    <button onClick={syncPosterFields}
                      className="text-xs px-3 py-1 rounded-md border border-sky-200 text-sky-700 hover:bg-sky-50 transition-colors">
                      依已填欄位勾選
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {POSTER_FIELDS.map(f => (
                      <label key={f.id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                        <input type="checkbox" checked={posterSettings.fields[f.id]} onChange={() => togglePosterField(f.id)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-300" />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Section>
        )}

          </main>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
            {/* 快速解析 */}
            <Section title="快速貼上解析">
              <FreeTextParser onApply={handleApplyParsed} />
            </Section>

        {/* Options */}
        <Section title="產出設定">
          <div className="flex flex-col gap-5">
            {/* 字數長度 先 */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">字數長度</p>
              <div className="flex gap-2 flex-wrap">
                {LENGTHS.map(l => (
                  <button key={l} onClick={() => setLength(l)}
                    className={`text-sm px-3 py-1.5 rounded-md border transition-all ${length === l ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
                    {l === "無" ? "無（純資訊）" : l}
                  </button>
                ))}
              </div>
              {infoOnly && <p className="text-xs text-slate-400 mt-1.5">選「無」時只輸出活動資訊，不加入語氣潤飾或開場白。</p>}
            </div>

            {/* 文案語氣（選無時灰化） */}
            <div className={infoOnly ? "opacity-40 pointer-events-none" : ""}>
              <p className="text-xs font-medium text-slate-500 mb-2">文案語氣</p>
              <div className="flex flex-wrap gap-2">
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)}
                    className={`text-sm px-3 py-1.5 rounded-md border transition-all ${tone === t ? "bg-sky-700 text-white border-sky-700" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 素材類型 */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">選擇要產出的素材類型</p>
              <div className="flex flex-wrap gap-2">
                {MATERIAL_TYPES.map(t => (
                  <button key={t.id} onClick={() => toggleType(t.id)}
                    className={`text-sm px-3 py-1.5 rounded-md border transition-all ${selectedTypes.includes(t.id) ? "bg-sky-700 text-white border-sky-700" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button onClick={handleGenerate} disabled={selectedTypes.length === 0}
            className="flex-1 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-md transition-colors text-sm shadow-sm">
            產生活動素材
          </button>
          <button onClick={handleClear}
            className="px-5 py-3 border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 rounded-md transition-colors text-sm">
            清除內容
          </button>
        </div>
          </aside>
        </div>

        {/* Results */}
        {generated && Object.keys(results).length > 0 && (
          <div id="results-section" className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-slate-800 mt-2">產出結果</h2>
            {MATERIAL_TYPES.filter(t => results[t.id] !== undefined).map(t => (
              <ResultCard key={t.id} label={t.label} content={results[t.id]}
                onCopy={() => handleCopy(t.id)} onRegen={() => handleRegen(t.id)} copied={!!copied[t.id]} />
            ))}
          </div>
        )}

        <footer className="text-center text-xs text-slate-400 pb-4">
          活動輔助整理 — 讓每場活動的文案工作更輕鬆
        </footer>
      </div>
    </div>
  );
}
