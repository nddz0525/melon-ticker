const https = require("https");

const productId = "211526"; // 원하는 공연 ID
const webhookUrl = "https://discord.com/api/webhooks/1384136406946939020/KPkMRI2Q7IF5S6vRsTPXLOrjNo9E6_UIz4HOO2x5D4FLOBZwfKUSvwGg2KY-Mio63WKd";

// 공통 https.get wrapper (User-Agent 포함)
function httpsGetWithHeaders(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0' // 크롬 브라우저처럼 위장
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// 공연 회차 정보 가져오기
async function fetchSchedules(productId) {
  const url = `https://ticket.melon.com/api/product/v1/performance/schedules?productId=${productId}`;
  const raw = await httpsGetWithHeaders(url);
  const parsed = JSON.parse(raw);
  return parsed.resultData || [];
}

// 좌석 정보 가져오기
async function fetchSeatInfo(productId, scheduleId) {
  const url = `https://ticket.melon.com/api/product/v1/performance/seatmap?productId=${productId}&scheduleId=${scheduleId}`;
  const raw = await httpsGetWithHeaders(url);
  const parsed = JSON.parse(raw);
  return parsed.resultData?.seatGrades || [];
}

// 디스코드 알림 전송
function sendDiscordAlert(title, time, seatCount) {
  const payload = JSON.stringify({
    embeds: [
      {
        title: "🎫 티켓 열림 알림",
        description: `**${title}**\n${time} 회차에 예매 가능한 좌석이 열렸습니다!`,
        url: `https://ticket.melon.com/performance/index.htm?prodId=${productId}`,
        color: 5814783,
        fields: [
          { name: "회차", value: time, inline: true },
          { name: "좌석 수", value: `${seatCount}석`, inline: true }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  });

  const urlObj = new URL(webhookUrl);
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": payload.length
    }
  };

  const req = https.request(options, (res) => {
    res.on("data", () => {});
    res.on("end", () => console.log("✅ 디스코드 알림 전송 완료"));
  });

  req.write(payload);
  req.end();
}

// 전체 실행
async function run() {
  try {
    const schedules = await fetchSchedules(productId);
    for (const schedule of schedules) {
      const scheduleId = schedule.scheduleId;
      const seatInfo = await fetchSeatInfo(productId, scheduleId);
      const totalLeft = seatInfo.reduce((acc, cur) => acc + cur.remainCnt, 0);
      if (totalLeft > 0) {
        sendDiscordAlert(schedule.performanceName, schedule.performanceDatetime, totalLeft);
      } else {
        console.log(`😔 ${schedule.performanceDatetime} - 남은 좌석 없음`);
      }
    }
  } catch (err) {
    console.error("❌ 오류 발생:", err.message);
  }
}

run();
