const https = require("https");

const productId = "211526";
const webhookUrl = "https://discord.com/api/webhooks/1384136406946939020/KPkMRI2Q7IF5S6vRsTPXLOrjNo9E6_UIz4HOO2x5D4FLOBZwfKUSvwGg2KY-Mio63WKd";

function fetchSchedules(productId) {
  const url = `https://ticket.melon.com/api/product/v1/performance/schedules?productId=${productId}`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const parsed = JSON.parse(data);
        resolve(parsed.resultData || []);
      });
    });
  });
}

function fetchSeatInfo(productId, scheduleId) {
  const url = `https://ticket.melon.com/api/product/v1/performance/seatmap?productId=${productId}&scheduleId=${scheduleId}`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const parsed = JSON.parse(data);
        resolve(parsed.resultData?.seatGrades || []);
      });
    });
  });
}

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

  const url = new URL(webhookUrl);
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": payload.length }
  };

  const req = https.request(options, (res) => {
    res.on("data", () => {});
    res.on("end", () => console.log("✅ 알림 전송 완료"));
  });

  req.write(payload);
  req.end();
}

async function run() {
  const schedules = await fetchSchedules(productId);

  for (const schedule of schedules) {
    const scheduleId = schedule.scheduleId;
    const seatInfo = await fetchSeatInfo(productId, scheduleId);

    let totalLeft = seatInfo.reduce((acc, cur) => acc + cur.remainCnt, 0);
    if (totalLeft > 0) {
      sendDiscordAlert(schedule.performanceName, schedule.performanceDatetime, totalLeft);
    }
  }
}

run();
