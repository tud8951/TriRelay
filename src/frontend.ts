export const frontendHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090e1b">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='18' fill='%231d3768'/%3E%3Cpath d='M18 23h10a9 9 0 0 1 0 18h-4m22-18H36a9 9 0 0 0 0 18h4' fill='none' stroke='%23b9d5ff' stroke-linecap='round' stroke-width='6'/%3E%3C/svg%3E">
  <title>TriRelay · 收件箱</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; background: #090e1b; color: #e8edf7; font-synthesis: none; }
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; background: radial-gradient(ellipse at 10% 0%, #172443 0, transparent 38%), #090e1b; }
    button, input, textarea { font: inherit; }
    button { cursor: pointer; }
    .shell { width: min(100% - 32px, 1120px); margin: 0 auto; padding: 32px 0 64px; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
    .brand { display: flex; align-items: center; gap: 13px; }
    .brand-mark { display: grid; width: 46px; height: 46px; place-items: center; border: 1px solid #385180; border-radius: 15px; background: linear-gradient(145deg, #1d3768, #14203a); color: #9dc2ff; font-size: 1.15rem; font-weight: 850; }
    h1 { margin: 0; font-size: clamp(1.35rem, 3vw, 1.75rem); letter-spacing: -.035em; }
    .subtitle { margin: 4px 0 0; color: #92a0b8; font-size: .9rem; }
    .header-actions { display: flex; gap: 9px; }
    #discord-command-status { margin: -16px 0 20px; color: #a7b5ca; font-size: .84rem; }
    #discord-command-status[data-kind="error"] { color: #ff9ca8; }
    #discord-command-status[data-kind="success"] { color: #8ce2b2; }
    .integration-panel { margin-bottom: 20px; padding: 20px 23px; }
    .integration-head { margin-bottom: 15px; }
    .integration-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .integration-card { padding: 15px; border: 1px solid #293852; border-radius: 13px; background: #111c2e; }
    .integration-card h3 { margin: 0; font-size: .95rem; }
    .integration-card p { margin: 7px 0 12px; color: #92a0b8; font-size: .82rem; line-height: 1.5; }
    .integration-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .integration-url { display: block; margin-top: 9px; color: #a9c8ff; font-size: .78rem; overflow-wrap: anywhere; }
    #integration-status { min-height: 1.3em; margin: 10px 0 0; color: #8ce2b2; font-size: .82rem; }
    #integration-status[data-kind="error"] { color: #ff9ca8; }
    .layout { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(330px, .95fr); gap: 20px; align-items: start; }
    .panel { overflow: hidden; border: 1px solid #26334b; border-radius: 20px; background: linear-gradient(160deg, #121b2c, #0f1726 72%); box-shadow: 0 20px 60px #0002; }
    .panel-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 21px 23px 16px; }
    .panel-title { margin: 0; font-size: 1.08rem; }
    .panel-note { margin: 5px 0 0; color: #8290a8; font-size: .82rem; }
    .panel-body { padding: 0 23px 23px; }
    label, legend { display: block; margin: 17px 0 8px; color: #dce5f4; font-size: .87rem; font-weight: 650; }
    input[type="password"], textarea { width: 100%; padding: 12px 14px; border: 1px solid #34425b; border-radius: 11px; outline: none; background: #0a1120; color: #edf3ff; transition: border-color .16s, box-shadow .16s; }
    textarea { min-height: 115px; resize: vertical; line-height: 1.55; }
    input:focus, textarea:focus { border-color: #5791ff; box-shadow: 0 0 0 3px #3b82f622; }
    input[type="file"] { display: block; width: 100%; padding: 12px; border: 1px dashed #465675; border-radius: 11px; background: #0a1120; color: #9caac0; }
    .hint { margin: 8px 0 0; color: #8998b0; font-size: .8rem; line-height: 1.5; }
    fieldset { display: flex; gap: 20px; margin: 19px 0 0; padding: 13px 15px; border: 1px solid #34425b; border-radius: 12px; }
    fieldset legend { margin: 0; padding: 0 5px; }
    fieldset label { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-weight: 500; }
    input[type="checkbox"] { width: 17px; height: 17px; accent-color: #4c8cff; }
    .btn { display: inline-flex; justify-content: center; align-items: center; gap: 8px; min-height: 38px; padding: 8px 13px; border: 1px solid #34425b; border-radius: 10px; background: #172238; color: #dce6f6; font-size: .86rem; font-weight: 650; transition: background .15s, border-color .15s; }
    .btn:hover { border-color: #57739f; background: #1c2a43; }
    .btn-primary { width: 100%; min-height: 47px; margin-top: 20px; border: 0; background: linear-gradient(100deg, #3475f6, #4c8cff); color: white; font-size: .98rem; box-shadow: 0 8px 24px #2763d833; }
    .btn-primary:hover { background: linear-gradient(100deg, #4280ff, #609aff); }
    .btn-danger { border-color: #5b3440; background: #261922; color: #ffb7c2; }
    .btn-danger:hover { background: #38202b; }
    .btn:disabled { opacity: .58; cursor: wait; }
    #status { min-height: 1.45em; margin: 13px 0 0; color: #a7b5ca; font-size: .86rem; line-height: 1.5; overflow-wrap: anywhere; }
    #status[data-kind="error"] { color: #ff9ca8; }
    #status[data-kind="success"] { color: #8ce2b2; }
    .inbox { min-height: 340px; }
    #messages { display: grid; gap: 11px; max-height: 650px; overflow: auto; padding: 0 23px 22px; }
    .message { padding: 14px 15px; border: 1px solid #293852; border-radius: 13px; background: #111c2e; }
    .message-meta { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 9px; color: #94a4bd; font-size: .77rem; }
    .source { display: inline-flex; align-items: center; gap: 6px; color: #b8cfff; font-weight: 700; }
    .message-content { margin: 0; color: #e4ebf6; line-height: 1.6; overflow-wrap: anywhere; white-space: pre-wrap; }
    .message-image { display: block; max-width: 100%; max-height: 420px; margin-top: 12px; border: 1px solid #293852; border-radius: 11px; object-fit: contain; cursor: zoom-in; }
    #image-viewer:not([open]) { display: none; }
    #image-viewer[open] { display: grid; width: 100vw; max-width: none; height: 100dvh; max-height: none; place-items: center; padding: 24px; border: 0; border-radius: 0; background: #050914ed; }
    #image-viewer::backdrop { background: transparent; backdrop-filter: blur(5px); }
    #image-viewer img { max-width: 96vw; max-height: 94vh; object-fit: contain; cursor: zoom-out; }
    #image-viewer img:focus-visible { outline: 2px solid #9dc2ff; outline-offset: 4px; }
    .image-error { margin: 10px 0 0; color: #ffb7c2; font-size: .84rem; }
    .message-file { display: inline-flex; margin-top: 11px; color: #a9c8ff; font-size: .88rem; font-weight: 650; text-decoration: none; }
    .message-file:hover { text-decoration: underline; }
    .empty { padding: 58px 20px; color: #8998b0; text-align: center; }
    .empty-icon { margin-bottom: 12px; font-size: 1.8rem; opacity: .7; }
    dialog { width: min(calc(100% - 32px), 420px); padding: 0; border: 1px solid #34425b; border-radius: 19px; background: #111b2c; color: #e8edf7; box-shadow: 0 30px 100px #000a; }
    dialog::backdrop { background: #050914cc; backdrop-filter: blur(7px); }
    .login-card { padding: 26px; }
    .login-card h2 { margin: 0; font-size: 1.3rem; }
    .login-card p { margin: 8px 0 18px; color: #91a0b8; font-size: .9rem; line-height: 1.5; }
    .login-error { min-height: 1.3em; margin-top: 10px; color: #ff9ca8; font-size: .85rem; }
    [hidden] { display: none !important; }
    @media (max-width: 760px) { .layout { grid-template-columns: 1fr; } .shell { width: min(100% - 24px, 560px); padding-top: 22px; } .panel-head { padding: 18px 18px 14px; } .panel-body { padding: 0 18px 19px; } #messages { padding: 0 18px 18px; } }
    @media (max-width: 560px) { .integration-grid { grid-template-columns: 1fr; } .integration-panel { padding: 18px; } }
    @media (max-width: 420px) { header { align-items: flex-start; } .header-actions { flex-direction: column; } fieldset { gap: 14px; } }
  </style>
</head>
<body>
  <dialog id="login-dialog">
    <form id="login-form" class="login-card">
      <div class="brand-mark" aria-hidden="true">TR</div>
      <h2 style="margin-top:16px">欢迎回来</h2>
      <p>输入网页口令以访问互传面板和消息收件箱。登录状态会安全保存在此浏览器中。</p>
      <label for="password">访问口令</label>
      <input id="password" type="password" autocomplete="current-password" required autofocus>
      <button class="btn btn-primary" type="submit">解锁面板</button>
      <div id="login-error" class="login-error" role="status"></div>
    </form>
  </dialog>
  <dialog id="image-viewer" aria-label="图片预览">
    <img id="image-viewer-content" alt="放大预览；点击图片或按 Esc 关闭">
  </dialog>
  <div id="app" class="shell" hidden>
    <header>
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">TR</div>
        <div><h1>TriRelay</h1><p class="subtitle">跨平台消息桥接与收件箱</p></div>
      </div>
      <div class="header-actions">
        <button id="register-discord" class="btn" type="button">注册 Discord 指令</button>
        <button id="refresh" class="btn" type="button">↻ 刷新收件箱</button>
        <button id="logout" class="btn" type="button">退出登录</button>
      </div>
    </header>
    <p id="discord-command-status" role="status" aria-live="polite"></p>
    <div class="layout">
      <section class="panel">
        <div class="panel-head"><div><h2 class="panel-title">发送消息</h2><p class="panel-note">发送文字或图片到任一平台</p></div></div>
        <div class="panel-body">
          <form id="send-form">
            <label for="message">文字内容</label>
            <textarea id="message" name="text" maxlength="4096" placeholder="写点什么…"></textarea>
            <label for="image">图片附件</label>
            <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple>
            <p class="hint">JPEG、PNG、GIF、WebP；最多 10 张，总大小受部署配置限制。</p>
            <fieldset>
              <legend>发送目标</legend>
              <label><input type="checkbox" name="target" value="telegram" checked> Telegram</label>
              <label><input type="checkbox" name="target" value="discord"> Discord</label>
            </fieldset>
            <button id="submit" class="btn btn-primary" type="submit">发送消息</button>
            <p id="status" role="status" aria-live="polite"></p>
          </form>
        </div>
      </section>
      <section class="panel inbox">
        <div class="panel-head">
          <div><h2 class="panel-title">消息收件箱</h2><p class="panel-note">通过 Telegram /web 或 Discord /web 收到的消息</p></div>
          <button id="clear" class="btn btn-danger" type="button">清空历史</button>
        </div>
        <div id="messages" aria-live="polite"><div class="empty"><div class="empty-icon">✉</div>正在读取消息…</div></div>
      </section>
    </div>
    <section class="panel integration-panel" aria-labelledby="integration-title">
      <div class="integration-head"><h2 id="integration-title" class="panel-title">平台配置</h2><p class="panel-note">快速配置 Telegram webhook 和 Discord Interactions</p></div>
      <div class="integration-grid">
        <article class="integration-card">
          <h3>Telegram</h3>
          <p>打开配置入口，为当前 Worker 设置 Telegram webhook。</p>
          <div class="integration-actions"><a class="btn" href="/telegram" target="_blank" rel="noopener noreferrer">打开 Telegram 配置</a></div>
        </article>
        <article class="integration-card">
          <h3>Discord</h3>
          <p>复制下面的地址，在 Discord Developer Portal 的 Interactions Endpoint URL 中粘贴。</p>
          <div class="integration-actions">
            <button id="copy-discord-endpoint" class="btn" type="button">复制 Interactions 地址</button>
            <a class="btn" href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer">创建 Discord 机器人</a>
          </div>
          <code id="discord-endpoint" class="integration-url"></code>
        </article>
      </div>
      <p id="integration-status" role="status" aria-live="polite"></p>
    </section>
  </div>
  <script>
    const app = document.querySelector("#app");
    const loginDialog = document.querySelector("#login-dialog");
    const loginForm = document.querySelector("#login-form");
    const loginError = document.querySelector("#login-error");
    const imageViewer = document.querySelector("#image-viewer");
    const imageViewerContent = document.querySelector("#image-viewer-content");
    const status = document.querySelector("#status");
    const messages = document.querySelector("#messages");
    const api = async (path, options = {}) => {
      const response = await fetch(path, { credentials: "same-origin", ...options });
      const data = response.status === 204 ? {} : await response.json();
      if (!response.ok) throw new Error(data.error || "请求失败（" + response.status + "）");
      return data;
    };
    const showLogin = () => {
      app.hidden = true;
      if (!loginDialog.open) loginDialog.showModal();
      document.querySelector("#password").focus();
    };
    const openImageViewer = (image) => {
      imageViewerContent.src = image.src;
      imageViewerContent.alt = image.alt + "；点击图片或按 Esc 关闭";
      imageViewer.showModal();
      imageViewerContent.focus();
    };
    imageViewerContent.addEventListener("click", () => imageViewer.close());
    imageViewer.addEventListener("click", (event) => {
      if (event.target === imageViewer) imageViewer.close();
    });
    imageViewer.addEventListener("close", () => {
      imageViewerContent.removeAttribute("src");
    });
    imageViewer.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        imageViewer.close();
      }
    });
    const renderMessages = (items) => {
      messages.replaceChildren();
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.innerHTML = '<div class="empty-icon">✉</div>收件箱还是空的<br><small>试试发送 /web 你好</small>';
        messages.append(empty);
        return;
      }
      for (const item of items) {
        const card = document.createElement("article");
        card.className = "message";
        const meta = document.createElement("div");
        meta.className = "message-meta";
        const source = document.createElement("span");
        source.className = "source";
        source.textContent = (item.source === "telegram" ? "✈ Telegram" : "◉ Discord") + " · " + item.sender;
        const date = document.createElement("time");
        date.dateTime = new Date(item.created_at).toISOString();
        date.textContent = new Date(item.created_at).toLocaleString();
        meta.append(source, date);
        const content = document.createElement("p");
        content.className = "message-content";
        content.textContent = item.content;
        card.append(meta, content);
        if (item.has_image) {
          const image = document.createElement("img");
          image.className = "message-image";
          image.src = "/api/messages/" + encodeURIComponent(item.id) + "/image";
          image.alt = "Telegram 收件图片";
          image.loading = "lazy";
          image.tabIndex = 0;
          image.setAttribute("role", "button");
          image.setAttribute("aria-label", "放大查看 Telegram 图片");
          image.addEventListener("click", () => openImageViewer(image));
          image.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openImageViewer(image);
            }
          });
          image.addEventListener("error", () => {
            const fallback = document.createElement("p");
            fallback.className = "image-error";
            fallback.textContent = "图片加载失败，可能是 Telegram 文件链接已失效。";
            image.replaceWith(fallback);
          }, { once: true });
          card.append(image);
        }
        if (item.has_file && item.file_content_type?.startsWith("image/")) {
          const image = document.createElement("img");
          image.className = "message-image";
          image.src = "/api/messages/" + encodeURIComponent(item.id) + "/file";
          image.alt = item.file_name || "Discord 图片";
          image.loading = "lazy";
          image.tabIndex = 0;
          image.setAttribute("role", "button");
          image.setAttribute("aria-label", "放大查看 Discord 图片");
          image.addEventListener("click", () => openImageViewer(image));
          image.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openImageViewer(image);
            }
          });
          image.addEventListener("error", () => {
            const fallback = document.createElement("p");
            fallback.className = "image-error";
            fallback.textContent = "图片加载失败，可能是 Discord 附件链接已失效。";
            image.replaceWith(fallback);
          }, { once: true });
          card.append(image);
        } else if (item.has_file) {
          const file = document.createElement("a");
          file.className = "message-file";
          file.href = "/api/messages/" + encodeURIComponent(item.id) + "/file";
          file.textContent = "↓ " + (item.file_name || "下载图片") + (item.file_size ? " · " + Math.ceil(item.file_size / 1024) + " KB" : "");
          card.append(file);
        }
        messages.append(card);
      }
    };
    const loadMessages = async () => {
      try {
        const data = await api("/api/messages");
        renderMessages(data.messages);
      } catch (error) {
        if (error.message.includes("口令")) return showLogin();
        messages.textContent = error.message;
      }
    };
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      loginError.textContent = "";
      const button = loginForm.querySelector("button");
      button.disabled = true;
      try {
        await api("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: document.querySelector("#password").value }) });
        document.querySelector("#password").value = "";
        loginDialog.close();
        app.hidden = false;
        await loadMessages();
      } catch (error) {
        loginError.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
    document.querySelector("#send-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";
      status.removeAttribute("data-kind");
      const form = event.currentTarget;
      const targets = [...form.querySelectorAll('input[name="target"]:checked')].map((item) => item.value);
      if (!targets.length) { status.textContent = "请选择至少一个发送目标。"; status.dataset.kind = "error"; return; }
      const images = document.querySelector("#image").files;
      if (images.length > 10) { status.textContent = "一次最多上传 10 张图片。"; status.dataset.kind = "error"; return; }
      const data = new FormData();
      data.set("text", document.querySelector("#message").value);
      for (const image of images) data.append("image", image);
      targets.forEach((target) => data.append("target", target));
      const button = document.querySelector("#submit");
      button.disabled = true;
      button.textContent = "发送中…";
      try {
        const response = await fetch("/api/send", { method: "POST", credentials: "same-origin", body: data });
        const result = await response.json();
        if (response.status === 401) return showLogin();
        if (result.targets) {
          const lines = Object.entries(result.targets).map(([name, value]) => name + "：" + (value.ok ? "发送成功" : "发送失败" + (value.error ? "（" + value.error + "）" : "")));
          status.textContent = lines.join("；");
          status.dataset.kind = result.ok ? "success" : "error";
        } else {
          status.textContent = result.error || "发送失败，请稍后重试。";
          status.dataset.kind = "error";
        }
      } catch (error) {
        status.textContent = error.message || "网络错误，发送状态未知。";
        status.dataset.kind = "error";
      } finally {
        button.disabled = false;
        button.textContent = "发送消息";
      }
    });
    document.querySelector("#refresh").addEventListener("click", loadMessages);
    const discordEndpoint = window.location.origin + "/discord/interactions";
    document.querySelector("#discord-endpoint").textContent = discordEndpoint;
    document.querySelector("#copy-discord-endpoint").addEventListener("click", async () => {
      const result = document.querySelector("#integration-status");
      try {
        await navigator.clipboard.writeText(discordEndpoint);
        result.textContent = "已复制 Discord Interactions 地址。";
        result.dataset.kind = "success";
      } catch {
        result.textContent = "自动复制失败，请手动复制上方显示的地址。";
        result.dataset.kind = "error";
      }
    });
    document.querySelector("#register-discord").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const result = document.querySelector("#discord-command-status");
      result.textContent = "";
      result.removeAttribute("data-kind");
      button.disabled = true;
      button.textContent = "正在注册…";
      try {
        const data = await api("/api/register-discord", { method: "POST" });
        result.textContent = "Discord 指令已注册：" + data.commands.map((name) => "/" + name).join("、") + "。若暂未显示，请稍等片刻后重新打开指令菜单。";
        result.dataset.kind = "success";
      } catch (error) {
        result.textContent = error.message || "注册失败，请稍后重试。";
        result.dataset.kind = "error";
        if (error.message.includes("网页口令")) showLogin();
      } finally {
        button.disabled = false;
        button.textContent = "注册 Discord 指令";
      }
    });
    document.querySelector("#clear").addEventListener("click", async () => {
      if (!window.confirm("确定清除全部收件箱历史吗？此操作会永久删除 D1 数据库中的消息。")) return;
      try {
        await api("/api/messages", { method: "DELETE" });
        renderMessages([]);
      } catch (error) {
        if (error.message.includes("口令")) return showLogin();
        window.alert(error.message);
      }
    });
    document.querySelector("#logout").addEventListener("click", async () => {
      await api("/api/logout", { method: "POST" });
      showLogin();
    });
    (async () => {
      try {
        const session = await api("/api/session");
        if (session.authenticated) {
          loginDialog.close();
          app.hidden = false;
          await loadMessages();
        } else showLogin();
      } catch (error) {
        showLogin();
        loginError.textContent = error.message;
      }
    })();
    window.setInterval(() => {
      if (!app.hidden && !loginDialog.open) loadMessages();
    }, 15000);
  </script>
</body>
</html>`;
