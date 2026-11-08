import { frontendHtml } from "./frontend";

interface Env { DB: D1Database; tgbotapi?: string; dcbotapi?: string; TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID: string; DISCORD_APPLICATION_ID: string; DISCORD_PUBLIC_KEY: string; DISCORD_WEBHOOK_URL?: string; DISCORD_USER_ID?: string; BRIDGE_SECRET: string; kouling?: string; MAX_FILE_SIZE_MB?: string; }
interface TelegramUpdate { update_id: number; message?: { chat: { id: number | string }; from?: { first_name?: string; username?: string }; text?: string; caption?: string; voice?: { file_id: string; file_size?: number }; document?: { file_id: string; file_name?: string; file_size?: number }; photo?: Array<{ file_id: string; file_size?: number }> }; }
interface DiscordInteraction { type: number; application_id: string; token: string; user?: { username?: string; global_name?: string }; member?: { user?: { username?: string; global_name?: string } }; data?: { name?: string; options?: Array<{ name: string; type?: number; value?: string; options?: Array<{ name: string; value?: string }> }>; resolved?: { attachments?: Record<string, { url: string; proxy_url?: string; filename?: string; size?: number; content_type?: string }> } }; }

const DISCORD_PING = 1;
const DISCORD_APPLICATION_COMMAND = 2;
const MAX_DEFAULT_BYTES = 25 * 1024 * 1024;
const MAX_FORM_OVERHEAD_BYTES = 64 * 1024;
const MAX_TELEGRAM_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export default { async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response(frontendHtml, { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'", "x-content-type-options": "nosniff" } });
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "TriRelay" });
    if (request.method === "GET" && url.pathname === "/api/session") return json({ authenticated: await hasWebSession(request, env) });
    if (request.method === "POST" && url.pathname === "/api/login") return handleWebLogin(request, env);
    if (request.method === "POST" && url.pathname === "/api/logout") return new Response(null, { status: 204, headers: { "set-cookie": "bridge_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" } });
    if (request.method === "POST" && url.pathname === "/api/register-discord") return handleRegisterDiscordCommands(request, env);
    if (request.method === "GET" && url.pathname === "/api/messages") return handleListWebMessages(request, env);
    const messageFileMatch = url.pathname.match(/^\/api\/messages\/([0-9a-f-]+)\/file$/i);
    if (request.method === "GET" && messageFileMatch) return handleWebMessageFile(request, env, messageFileMatch[1]);
    const messageImageMatch = url.pathname.match(/^\/api\/messages\/([0-9a-f-]+)\/image$/i);
    if (request.method === "GET" && messageImageMatch) return handleWebMessageImage(request, env, messageImageMatch[1]);
    if (request.method === "DELETE" && url.pathname === "/api/messages") return handleClearWebMessages(request, env);
    if (request.method === "POST" && url.pathname === "/api/send") return handleFrontendSend(request, env);
    if (request.method === "GET" && url.pathname === "/telegram") return setupTelegramWebhook(url, env);
    if (request.method === "POST" && url.pathname === "/telegram/webhook") return handleTelegramWebhook(request, env);
    if (request.method === "POST" && url.pathname === "/discord/interactions") return handleDiscordInteraction(request, env, ctx);
    return new Response("Not found", { status: 404 });
  } catch (error) { console.error(error); return json({ error: "Internal server error" }, 500); }
} };

async function handleWebLogin(request: Request, env: Env): Promise<Response> {
  const expectedCode = env.kouling;
  if (!expectedCode || expectedCode.length < 12) return json({ error: "网页口令尚未配置。" }, 503);
  let body: { password?: unknown };
  try { body = await request.json() as { password?: unknown }; }
  catch { return json({ error: "请求格式无效。" }, 400); }
  if (typeof body.password !== "string" || !(await matchesAccessCode(body.password, expectedCode))) return json({ error: "口令错误。" }, 401);
  return json({ ok: true }, 200, { "set-cookie": `bridge_session=${encodeURIComponent(expectedCode)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000` });
}

async function hasWebSession(request: Request, env: Env): Promise<boolean> {
  const expectedCode = env.kouling;
  if (!expectedCode) return false;
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("bridge_session="));
  if (!cookie) return false;
  try {
    return await matchesAccessCode(decodeURIComponent(cookie.slice("bridge_session=".length)), expectedCode);
  } catch {
    return false;
  }
}

async function requireWebSession(request: Request, env: Env): Promise<Response | undefined> {
  return await hasWebSession(request, env) ? undefined : json({ error: "请先输入网页口令。" }, 401);
}

async function handleRegisterDiscordCommands(request: Request, env: Env): Promise<Response> {
  const unauthorized = await requireWebSession(request, env);
  if (unauthorized) return unauthorized;
  if (!env.dcbotapi || !env.DISCORD_APPLICATION_ID) {
    return json({ error: "Discord Bot Token 或 Application ID 尚未配置为 Worker Secret。" }, 503);
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

  let response: Response;
  try {
    response = await fetch(`https://discord.com/api/v10/applications/${encodeURIComponent(env.DISCORD_APPLICATION_ID)}/commands`, {
      method: "PUT",
      headers: { Authorization: `Bot ${discordToken(env)}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
    });
  } catch (error) {
    console.error("Discord command registration request failed", error);
    return json({ error: "无法连接 Discord API，请稍后重试。" }, 502);
  }

  const responseText = await response.text();
  if (!response.ok) {
    console.error("Discord command registration failed", response.status, responseText);
    return json({ error: `Discord 注册失败（HTTP ${response.status}）：${responseText.slice(0, 500)}` }, 502);
  }
  let registered: Array<{ name?: string; id?: string }>;
  try {
    registered = JSON.parse(responseText) as Array<{ name?: string; id?: string }>;
  } catch (error) {
    console.error("Discord command registration returned invalid JSON", error);
    return json({ error: "Discord 已响应，但返回数据无法识别；请检查 Discord 指令列表。" }, 502);
  }
  return json({ ok: true, commands: registered.map(({ name }) => name).filter((name): name is string => Boolean(name)) });
}

async function handleListWebMessages(request: Request, env: Env): Promise<Response> {
  const unauthorized = await requireWebSession(request, env);
  if (unauthorized) return unauthorized;
  const { results } = await env.DB.prepare(
    "SELECT id, source, sender, content, created_at, image_file_id IS NOT NULL AS has_image, (file_url IS NOT NULL OR file_data IS NOT NULL) AS has_file, file_name, file_content_type, file_size FROM web_messages ORDER BY created_at DESC LIMIT 200",
  ).all<{ id: string; source: string; sender: string; content: string; created_at: number; has_image: number; has_file: number; file_name: string | null; file_content_type: string | null; file_size: number | null }>();
  return json({ messages: results });
}

async function handleWebMessageFile(request: Request, env: Env, messageId: string): Promise<Response> {
  const unauthorized = await requireWebSession(request, env);
  if (unauthorized) return unauthorized;
  const row = await env.DB.prepare("SELECT file_url, file_proxy_url, file_data, file_name, file_content_type, file_size FROM web_messages WHERE id = ?")
    .bind(messageId)
    .first<{ file_url: string | null; file_proxy_url: string | null; file_data: ArrayBuffer | Uint8Array | number[] | null; file_name: string | null; file_content_type: string | null; file_size: number | null }>();
  if (!row?.file_url && !row?.file_proxy_url && !row?.file_data) return new Response("Not found", { status: 404 });
  const contentType = safeContentType(row.file_content_type ?? "application/octet-stream");
  const filename = safeUploadName(row.file_name ?? "discord-file");
  const disposition = contentType.startsWith("image/") ? "inline" : "attachment";
  const headers = new Headers({
      "content-type": contentType,
      "content-disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
  });
  const imageUrls = [...new Set([row.file_url, row.file_proxy_url].filter((value): value is string => Boolean(value)))];
  for (const imageUrl of imageUrls) {
    let image: Response;
    try {
      image = await fetchDiscordImage(imageUrl);
    } catch (error) {
      console.error("Discord image fetch failed", error);
      continue;
    }
    if (!image.ok) {
      console.error("Discord image fetch returned an error", image.status);
      await image.body?.cancel();
      continue;
    }
    const upstreamType = safeContentType(image.headers.get("content-type")?.split(";")[0] ?? contentType);
    if (!ALLOWED_IMAGE_TYPES.has(upstreamType)) {
      console.error("Discord image endpoint returned a non-image content type", upstreamType);
      await image.body?.cancel();
      continue;
    }
    headers.set("content-type", upstreamType);
    return new Response(image.body, { headers });
  }
  if (!row.file_data) return new Response("Not found", { status: 404 });
  const data = binaryBytes(row.file_data);
  const body = new ArrayBuffer(data.byteLength);
  new Uint8Array(body).set(data);
  return new Response(body, { headers });
}

async function handleWebMessageImage(request: Request, env: Env, messageId: string): Promise<Response> {
  const unauthorized = await requireWebSession(request, env);
  if (unauthorized) return unauthorized;
  const row = await env.DB.prepare("SELECT image_file_id FROM web_messages WHERE id = ?")
    .bind(messageId)
    .first<{ image_file_id: string | null }>();
  if (!row?.image_file_id) return new Response("Not found", { status: 404 });
  const file = await telegramApi<{ result?: { file_path?: string } }>(env, "getFile", { file_id: row.image_file_id });
  if (!file.result?.file_path) throw new Error("Telegram did not return an image file path");
  const response = await fetch(`${telegramFileBase(env)}/${file.result.file_path}`);
  if (!response.ok) throw new Error(`Telegram image download failed: ${response.status}`);
  return new Response(response.body, {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}

async function handleClearWebMessages(request: Request, env: Env): Promise<Response> {
  const unauthorized = await requireWebSession(request, env);
  if (unauthorized) return unauthorized;
  await env.DB.prepare("DELETE FROM web_messages").run();
  return json({ ok: true });
}

async function saveWebMessage(
  env: Env,
  source: "telegram" | "discord",
  sender: string,
  content: string,
  imageFileId?: string,
  attachment?: { name: string; contentType: string; size: number | null; url: string; proxyUrl?: string | null },
): Promise<void> {
  const normalized = content.trim().slice(0, 4000);
  if (!normalized && !imageFileId && !attachment) throw new Error("网页消息内容不能为空");
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO web_messages (id, source, sender, content, created_at, image_file_id, file_name, file_content_type, file_size, file_url, file_data, file_proxy_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(
    id,
    source,
    sender.slice(0, 100),
    normalized,
    Date.now(),
    imageFileId ?? null,
    attachment?.name ?? null,
    attachment?.contentType ?? null,
    attachment?.size ?? null,
    attachment?.url ?? null,
    null,
    attachment?.proxyUrl ?? null,
  ).run();
}

async function handleFrontendSend(request: Request, env: Env): Promise<Response> {
  const expectedCode = env.kouling;
  if (!expectedCode || expectedCode.length < 12) return json({ error: "网页提交功能尚未配置有效的访问口令。" }, 503);
  const authorization = request.headers.get("authorization") ?? "";
  const suppliedCode = await hasWebSession(request, env) ? expectedCode : authorization.match(/^Bearer (.+)$/i)?.[1] ?? "";
  if (!(await matchesAccessCode(suppliedCode, expectedCode))) return json({ error: "访问口令错误。" }, 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) return json({ error: "请求格式无效。" }, 415);

  const maxBytes = maxFileSize(env);
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes + MAX_FORM_OVERHEAD_BYTES) return json({ error: "上传内容超过大小限制。" }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "上传表单无效。" }, 400);
  }
  const textEntry = form.get("text");
  if (textEntry !== null && typeof textEntry !== "string") return json({ error: "文字内容无效。" }, 400);
  const text = (textEntry ?? "").trim();
  const targets = form.getAll("target");
  if (targets.some((target) => target !== "telegram" && target !== "discord")) return json({ error: "发送目标无效。" }, 400);
  const selectedTargets = new Set(targets as string[]);
  if (selectedTargets.size === 0) return json({ error: "请选择至少一个发送目标。" }, 400);

  const imageEntries = form.getAll("image");
  if (imageEntries.length > 10) return json({ error: "一次最多上传 10 张图片。" }, 400);
  const uploads: Array<{ name: string; data: ArrayBuffer; type: string }> = [];
  let totalImageBytes = 0;
  for (const entry of imageEntries) {
    if (typeof entry === "string") return json({ error: "图片文件无效。" }, 400);
    if (entry.size === 0) return json({ error: "图片文件不能为空。" }, 400);
    const type = entry.type.toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(type)) return json({ error: "仅支持 JPEG、PNG、GIF 和 WebP 图片。" }, 415);
    totalImageBytes += entry.size;
    if (entry.size > maxBytes || totalImageBytes > maxBytes) return json({ error: `图片总大小不能超过 ${maxBytes / 1024 / 1024} MB。` }, 413);
    const data = await entry.arrayBuffer();
    if (!isImageData(type, new Uint8Array(data))) return json({ error: "图片内容与文件类型不匹配。" }, 415);
    uploads.push({ name: safeUploadName(entry.name), data, type });
  }
  if (!text && uploads.length === 0) return json({ error: "请输入文字或选择图片。" }, 400);

  const maxTextLength = selectedTargets.has("telegram") ? (uploads.length ? 1024 : 4096) : 2000;
  if (text.length > maxTextLength) return json({ error: `文字不能超过 ${maxTextLength} 个字符。` }, 413);
  const tasks: Array<[string, Promise<unknown>]> = [];
  if (selectedTargets.has("telegram")) tasks.push(["telegram", uploads.length ? telegramSendImages(env, uploads, text) : telegramSend(env, text)]);
  if (selectedTargets.has("discord")) tasks.push(["discord", discordSend(env, text, uploads)]);
  const settled = await Promise.allSettled(tasks.map(([, task]) => task));
  const results: Record<string, { ok: boolean; error?: string }> = {};
  settled.forEach((result, index) => {
    const target = tasks[index][0];
    if (result.status === "fulfilled") results[target] = { ok: true };
    else {
      console.error(`Frontend send to ${target} failed`, result.reason);
      const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
      results[target] = { ok: false, error: error.slice(0, 500) };
    }
  });
  const ok = Object.values(results).some((result) => result.ok);
  const allOk = Object.values(results).every((result) => result.ok);
  return json({ ok, targets: results }, allOk ? 200 : ok ? 207 : 502);
}

async function handleTelegramWebhook(request: Request, env: Env): Promise<Response> {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== env.BRIDGE_SECRET) return new Response("Unauthorized", { status: 401 });
  const update = await request.json() as TelegramUpdate;
  if (!update.message || String(update.message.chat.id) !== String(env.TELEGRAM_CHAT_ID)) return json({ ok: true, ignored: true });
  const message = update.message;
  const messageText = message.text ?? message.caption ?? "";
  const webCommand = messageText.match(/^\/web(?:@\w+)?(?:\s+([\s\S]*))?$/i);
  if (webCommand) {
    const sender = message.from?.username ? `@${message.from.username}` : message.from?.first_name ?? "Telegram";
    const imageFileId = message.photo?.at(-1)?.file_id;
    if (!webCommand[1]?.trim() && !imageFileId) {
      await telegramApi(env, "sendMessage", { chat_id: message.chat.id, text: "用法：/web 要发送到网页收件箱的内容" });
      return json({ ok: true });
    }
    await saveWebMessage(env, "telegram", sender, webCommand[1] ?? "", imageFileId);
    await telegramApi(env, "sendMessage", { chat_id: message.chat.id, text: "已保存到网页收件箱。" });
    return json({ ok: true, saved: true });
  }
  const sender = message.from?.username ? `@${message.from.username}` : message.from?.first_name ?? "Telegram";
  const text = messageText;
  const fileId = message.voice?.file_id ?? message.document?.file_id ?? message.photo?.at(-1)?.file_id;
  const fileName = message.voice ? "telegram-voice.ogg" : message.document?.file_name ?? (fileId ? "telegram-photo.jpg" : undefined);
  const fileSize = message.voice?.file_size ?? message.document?.file_size ?? message.photo?.at(-1)?.file_size;
  if (!text && !fileId) return json({ ok: true, ignored: true });
  if (fileSize && fileSize > maxFileSize(env)) { await telegramSend(env, `文件超过 ${maxFileSize(env) / 1024 / 1024} MB，未转发。`); return json({ ok: true }); }
  const content = text ? `**${escapeMarkdown(sender)}**\n${text}` : `**${escapeMarkdown(sender)}** 发送了${message.voice ? "语音" : "文件"}`;
  if (!fileId) { await discordSend(env, content); return json({ ok: true }); }
  const telegramFile = await telegramApi<{ result: { file_path: string } }>(env, "getFile", { file_id: fileId });
  const fileResponse = await fetch(`${telegramFileBase(env)}/${telegramFile.result.file_path}`);
  if (!fileResponse.ok) throw new Error(`Telegram file download failed: ${fileResponse.status}`);
  const fileData = await fileResponse.arrayBuffer();
  if (fileData.byteLength > maxFileSize(env)) throw new Error(`Telegram file exceeds ${maxFileSize(env) / 1024 / 1024} MB limit`);
  await discordSend(env, content, [{ name: fileName ?? "telegram-file", data: fileData }]);
  return json({ ok: true });
}

async function handleDiscordInteraction(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await request.text();
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !timestamp || !(await verifyDiscordSignature(body, signature, timestamp, env.DISCORD_PUBLIC_KEY))) return new Response("Invalid request signature", { status: 401 });
  const interaction = JSON.parse(body) as DiscordInteraction;
  if (interaction.type === DISCORD_PING) return json({ type: DISCORD_PING });
  const commandData = interaction.data;
  if (interaction.type !== DISCORD_APPLICATION_COMMAND || !commandData || !["bridge", "web"].includes(commandData.name ?? "")) return json({ type: 4, data: { content: "未知命令。", flags: 64 } });
  const options = flattenOptions(commandData.options ?? []);
  if (commandData.name === "web") {
    const sender = interaction.member?.user?.global_name ?? interaction.member?.user?.username ?? interaction.user?.global_name ?? interaction.user?.username ?? "Discord";
    const content = options.get("message") ?? "";
    const attachmentId = options.get("file");
    const attachment = attachmentId ? commandData.resolved?.attachments?.[attachmentId] : undefined;
    if (!content.trim() && !attachment?.url) {
      return json({ type: 4, data: { content: "请提供要保存到网页收件箱的消息或图片。", flags: 64 } });
    }
    if (attachment?.url) {
      ctx.waitUntil(saveDiscordWebFile(env, interaction, sender, attachment, content));
      return json({ type: 5, data: { flags: 64 } });
    }
    try {
      await saveWebMessage(env, "discord", sender, content);
      return json({ type: 4, data: { content: "已保存到网页收件箱。", flags: 64 } });
    } catch (error) {
      console.error("Could not save Discord /web message", error);
      return json({ type: 4, data: { content: "保存失败，请检查网页收件箱数据库配置。", flags: 64 } });
    }
  }
  const text = options.get("message") ?? "";
  const attachmentId = options.get("file");
  const attachmentUrl = attachmentId ? commandData.resolved?.attachments?.[attachmentId]?.url : undefined;
  if (!text && !attachmentUrl) return json({ type: 4, data: { content: "请提供 message 或 file。", flags: 64 } });
  const content = text ? `Discord\n${text}` : "Discord 发送了一个文件";
  ctx.waitUntil(forwardDiscordMessage(env, content, attachmentUrl));
  return json({ type: 4, data: { content: "已接收，正在转发到 Telegram。", flags: 64 } });
}

async function saveDiscordWebFile(
  env: Env,
  interaction: DiscordInteraction,
  sender: string,
  attachment: { url: string; proxy_url?: string; filename?: string; size?: number; content_type?: string },
  content = "",
): Promise<void> {
  let responseMessage = "图片已保存到网页收件箱。";
  try {
    const attachmentUrl = discordAttachmentUrl(attachment.url);
    const name = safeUploadName(attachment.filename ?? attachmentName(attachment.url));
    const extensionType = imageContentTypeFromName(name);
    const contentType = (attachment.content_type?.split(";")[0] ?? extensionType ?? "").trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      throw new Error("只允许上传 JPEG、PNG、GIF 或 WebP 图片。");
    }
    const maxBytes = maxFileSize(env);
    if (attachment.size !== undefined && attachment.size > maxBytes) {
      throw new Error(`图片超过 ${formatBytes(maxBytes)} 上传限制。`);
    }
    await saveWebMessage(env, "discord", sender, content, undefined, {
      name,
      contentType,
      size: attachment.size ?? null,
      url: attachmentUrl.toString(),
      proxyUrl: attachment.proxy_url ? discordAttachmentUrl(attachment.proxy_url).toString() : null,
    });
  } catch (error) {
    responseMessage = error instanceof Error ? error.message : "保存文件失败。";
    console.error("Could not save Discord /web file", error);
  }
  const { application_id: applicationId, token } = interaction;
  const response = await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: responseMessage }),
  });
  if (!response.ok) console.error(`Discord /web file confirmation failed: ${response.status}`);
}

async function forwardDiscordMessage(env: Env, content: string, attachmentUrl?: string) {
  if (!attachmentUrl) return telegramSend(env, content);
  const fileResponse = await fetch(attachmentUrl);
  if (!fileResponse.ok) throw new Error(`Discord attachment download failed: ${fileResponse.status}`);
  const size = Number(fileResponse.headers.get("content-length") ?? 0);
  if (size > maxFileSize(env)) return telegramSend(env, `Discord 文件超过 ${maxFileSize(env) / 1024 / 1024} MB，未转发。`);
  return telegramSendFile(env, await fileResponse.arrayBuffer(), attachmentName(attachmentUrl), content);
}

async function discordSend(env: Env, content: string, files: Array<{ name: string; data: ArrayBuffer }> = []) {
  let dmError: Error | undefined;
  if (env.DISCORD_USER_ID && env.dcbotapi) {
    try {
      const channel = await discordApi<{ id: string }>(env, "/users/@me/channels", { recipient_id: env.DISCORD_USER_ID });
      const form = new FormData();
      form.append("payload_json", JSON.stringify({ content, allowed_mentions: { parse: [] } }));
      appendDiscordFiles(form, files);
      const response = await fetch(`${discordApiBase(env)}/channels/${channel.id}/messages`, { method: "POST", headers: { Authorization: `Bot ${discordToken(env)}` }, body: form });
      if (!response.ok) throw new Error(`Discord DM failed: ${response.status} ${await response.text()}`);
      return;
    } catch (error) {
      dmError = error instanceof Error ? error : new Error(String(error));
      console.error("Discord DM delivery failed", dmError);
    }
  }
  if (env.DISCORD_WEBHOOK_URL) {
    const form = new FormData();
    form.append("payload_json", JSON.stringify({ content, username: "TG Bridge", allowed_mentions: { parse: [] } }));
    appendDiscordFiles(form, files);
    const webhookUrl = new URL(env.DISCORD_WEBHOOK_URL);
    webhookUrl.searchParams.set("wait", "true");
    const response = await fetch(webhookUrl, { method: "POST", body: form });
    if (!response.ok) {
      const webhookError = new Error(`Discord webhook failed: ${response.status} ${await response.text()}`);
      if (dmError) throw new Error(`${dmError.message}; ${webhookError.message}`);
      throw webhookError;
    }
    return;
  }
  if (dmError) throw dmError;
  throw new Error("Set DISCORD_WEBHOOK_URL or both DISCORD_USER_ID and dcbotapi");
}
function appendDiscordFiles(form: FormData, files: Array<{ name: string; data: ArrayBuffer }>) {
  files.forEach((file, index) => form.append(`files[${index}]`, new Blob([file.data]), file.name));
}
async function discordApi<T>(env: Env, path: string, payload: Record<string, string>): Promise<T> {
  const response = await fetch(`${discordApiBase(env)}${path}`, { method: "POST", headers: { Authorization: `Bot ${discordToken(env)}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Discord API failed: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}
function discordToken(env: Env): string { if (!env.dcbotapi) throw new Error("Missing dcbotapi"); return env.dcbotapi.replace(/^Bot\s+/i, ""); }
function discordApiBase(env: Env): string { return "https://discord.com/api/v10"; }
function discordAttachmentUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.port || !["cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname) || url.username || url.password) {
    throw new Error("Discord 附件地址无效。");
  }
  return url;
}
async function fetchDiscordImage(value: string): Promise<Response> {
  let url = discordAttachmentUrl(value);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url, { redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location || redirects === 3) throw new Error("Discord image redirect limit exceeded");
    url = discordAttachmentUrl(new URL(location, url).toString());
  }
  throw new Error("Discord image redirect limit exceeded");
}
function imageContentTypeFromName(name: string): string | undefined {
  const extension = name.toLowerCase().split(".").pop();
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" } as Record<string, string>)[extension ?? ""];
}
async function telegramSend(env: Env, text: string) { await telegramApi(env, "sendMessage", { chat_id: env.TELEGRAM_CHAT_ID, text }); }
async function telegramSendImages(env: Env, files: Array<{ name: string; data: ArrayBuffer; type: string }>, caption: string) {
  if (files.length > 1 && files.every((file) => file.data.byteLength <= MAX_TELEGRAM_PHOTO_BYTES)) {
    const form = new FormData();
    form.append("chat_id", env.TELEGRAM_CHAT_ID);
    const media = files.map((file, index) => {
      form.append(`file${index}`, new Blob([file.data], { type: file.type }), file.name);
      return { type: "photo", media: `attach://file${index}`, ...(index === 0 && caption ? { caption } : {}) };
    });
    form.append("media", JSON.stringify(media));
    const response = await fetch(`${telegramApiBase(env)}/sendMediaGroup`, { method: "POST", body: form });
    if (!response.ok) throw new Error(`Telegram image album upload failed: ${response.status} ${await response.text()}`);
    return;
  }
  for (let index = 0; index < files.length; index++) {
    await telegramSendImage(env, files[index], index === 0 ? caption : "");
  }
}
async function telegramSendImage(env: Env, file: { name: string; data: ArrayBuffer; type: string }, caption: string) {
  const usePhoto = file.data.byteLength <= MAX_TELEGRAM_PHOTO_BYTES;
  const form = new FormData();
  form.append("chat_id", env.TELEGRAM_CHAT_ID);
  if (caption) form.append("caption", caption);
  form.append(usePhoto ? "photo" : "document", new Blob([file.data], { type: file.type }), file.name);
  const response = await fetch(`${telegramApiBase(env)}/${usePhoto ? "sendPhoto" : "sendDocument"}`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Telegram image upload failed: ${response.status} ${await response.text()}`);
}
async function telegramSendFile(env: Env, data: ArrayBuffer, name: string, caption: string) {
  const form = new FormData(); form.append("chat_id", env.TELEGRAM_CHAT_ID); form.append("caption", caption); form.append("document", new Blob([data]), name);
  const response = await fetch(`${telegramApiBase(env)}/sendDocument`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Telegram upload failed: ${response.status}`);
}
async function telegramApi<T = unknown>(env: Env, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${telegramApiBase(env)}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Telegram API ${method} failed: ${response.status}`); return response.json() as Promise<T>;
}
async function setupTelegramWebhook(url: URL, env: Env): Promise<Response> {
  try {
    const webhookUrl = `${url.origin}/telegram/webhook`;
    const result = await telegramApi<{ ok: boolean; description?: string }>(env, "setWebhook", { url: webhookUrl, secret_token: env.BRIDGE_SECRET, allowed_updates: ["message"] });
    return new Response(`<h1>Telegram webhook ${result.ok ? "已配置" : "配置失败"}</h1><p>${result.description ?? webhookUrl}</p>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  } catch (error) {
    return new Response(`<h1>Telegram webhook 配置失败</h1><p>${error instanceof Error ? error.message : "Unknown error"}</p>`, { status: 500, headers: { "content-type": "text/html; charset=utf-8" } });
  }
}
function telegramApiBase(env: Env): string {
  const value = env.tgbotapi ?? env.TELEGRAM_BOT_TOKEN;
  if (!value) throw new Error("Missing tgbotapi");
  return value.startsWith("http") ? value.replace(/\/$/, "") : `https://api.telegram.org/bot${value}`;
}
function telegramFileBase(env: Env): string {
  const value = env.tgbotapi ?? env.TELEGRAM_BOT_TOKEN;
  if (!value) throw new Error("Missing tgbotapi");
  return value.startsWith("http") ? value.replace("/api.telegram.org/bot", "/api.telegram.org/file/bot") : `https://api.telegram.org/file/bot${value}`;
}
async function verifyDiscordSignature(body: string, signature: string, timestamp: string, publicKey: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey("raw", hexToBytes(publicKey) as BufferSource, { name: "Ed25519" }, false, ["verify"]);
    return crypto.subtle.verify("Ed25519", key, hexToBytes(signature) as BufferSource, new TextEncoder().encode(timestamp + body));
  } catch { return false; }
}
function flattenOptions(options: NonNullable<DiscordInteraction["data"]>["options"]): Map<string, string> {
  const result = new Map<string, string>(); for (const option of options ?? []) { if (typeof option.value === "string") result.set(option.name, option.value); for (const nested of option.options ?? []) if (typeof nested.value === "string") result.set(nested.name, nested.value); } return result;
}
function hexToBytes(hex: string): Uint8Array { return new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []); }
function attachmentName(url: string): string { return decodeURIComponent(new URL(url).pathname.split("/").pop() || "discord-file").slice(0, 100); }
function maxFileSize(env: Env): number {
  const configured = Number(env.MAX_FILE_SIZE_MB);
  return Number.isFinite(configured) && configured > 0 ? configured * 1024 * 1024 : MAX_DEFAULT_BYTES;
}
function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
async function matchesAccessCode(supplied: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [suppliedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const suppliedBytes = new Uint8Array(suppliedDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index++) difference |= suppliedBytes[index] ^ expectedBytes[index];
  return difference === 0;
}
function isImageData(type: string, data: Uint8Array): boolean {
  if (type === "image/png") return data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 && data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a;
  if (type === "image/jpeg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (type === "image/gif") return data.length >= 6 && new TextDecoder().decode(data.subarray(0, 6)).match(/^GIF8[79]a$/) !== null;
  if (type === "image/webp") return data.length >= 12 && new TextDecoder().decode(data.subarray(0, 4)) === "RIFF" && new TextDecoder().decode(data.subarray(8, 12)) === "WEBP";
  return false;
}
function safeUploadName(name: string): string {
  return name.replace(/[\\/]/g, "_").replace(/[^\p{L}\p{N}._-]/gu, "_").slice(0, 100) || "image";
}
function safeContentType(value: string): string {
  return /^[\w.+-]+\/[\w.+-]+$/.test(value) ? value : "application/octet-stream";
}
function binaryBytes(value: ArrayBuffer | Uint8Array | number[]): Uint8Array {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return Uint8Array.from(value);
}
function escapeMarkdown(value: string): string { return value.replace(/[\\*_`~|]/g, "\\$&"); }
function json(value: unknown, status = 200, headers: Record<string, string> = {}): Response { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...headers } }); }