const token = process.env.dcbotapi || process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;

if (!token || !applicationId) {
  console.error("缺少 dcbotapi 或 DISCORD_APPLICATION_ID");
  process.exit(1);
}

const commands = [
  {
    name: "bridge",
    description: "发送消息或文件到 Telegram",
    options: [
      { name: "message", description: "消息内容", type: 3, required: false },
      { name: "file", description: "选择要发送到 Telegram 的附件", type: 11, required: false },
    ],
  },
  {
    name: "web",
    description: "发送消息或图片到网页收件箱",
    options: [
      { name: "message", description: "要保存到网页收件箱的消息", type: 3, required: false },
      { name: "file", description: "选择要保存到网页收件箱的图片", type: 11, required: false },
    ],
  },
];

const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token.replace(/^Bot\s+/i, "")}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands),
});

const result = await response.json();
if (!response.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("Discord /bridge 和 /web 指令注册成功：", result.map(({ name, id }) => `${name}=${id}`).join(", "));