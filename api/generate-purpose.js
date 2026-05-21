module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const {
    name = "",
    subtitle = "",
    speaker = "",
    speakerTitle = "",
    audience = "",
    organizer = "",
    highlights = "",
    purpose = ""
  } = req.body || {};

  const input = [
    "請根據以下活動資訊，產生一段繁體中文「活動目的」。",
    "要求：",
    "- 80 到 140 字",
    "- 語氣自然、正式但不要僵硬",
    "- 適合大學系所活動公告",
    "- 不要使用條列",
    "- 不要捏造不存在的資訊",
    "- 只輸出活動目的本文，不要加標題",
    "",
    `活動名稱：${name || "未提供"}`,
    subtitle ? `副標題：${subtitle}` : "",
    speaker ? `講者：${speaker}` : "",
    speakerTitle ? `講者職稱／經歷：${speakerTitle}` : "",
    audience ? `活動對象：${audience}` : "",
    organizer ? `主辦單位：${organizer}` : "",
    highlights ? `活動亮點：${highlights}` : "",
    purpose ? `使用者目前草稿：${purpose}` : ""
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.2",
        instructions: "你是大學行政與活動文案助理，擅長寫清楚、自然、有吸引力的繁體中文活動文案。",
        input,
        max_output_tokens: 220
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenAI request failed"
      });
    }

    const text = data.output_text || data.output?.flatMap(item =>
      item.content?.filter(part => part.type === "output_text").map(part => part.text) || []
    ).join("\n");

    return res.status(200).json({ purpose: (text || "").trim() });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected server error" });
  }
};
