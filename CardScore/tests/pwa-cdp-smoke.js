"use strict";

async function run() {
  const debuggingPort = process.env.CDP_PORT || "9223";
  const tabs = await (await fetch(`http://127.0.0.1:${debuggingPort}/json/list`)).json();
  const page = tabs.find(item => item.type === "page" && item.url === "http://127.0.0.1:8765/");
  if (!page) throw new Error("CardScore tab not found");

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send("Page.enable");
  await send("Network.enable");
  await send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
    connectionType: "none"
  });
  await send("Page.reload", { ignoreCache: false });
  await new Promise(resolve => setTimeout(resolve, 1000));
  let result = await send("Runtime.evaluate", {
    expression: `(async () => {
      await navigator.serviceWorker.ready;
      const names = await caches.keys();
      const urls = (await Promise.all(names.map(async name =>
        (await caches.open(name)).keys()))).flat().map(request => request.url);
      return { controller: Boolean(navigator.serviceWorker.controller), names, urls, title: document.title };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (!result.result || !result.result.value) throw new Error(`PWA inspection failed: ${JSON.stringify(result)}`);
  const online = result.result.value;
  if (!Array.isArray(online.names) || !Array.isArray(online.urls)) {
    throw new Error(`Unexpected PWA inspection result: ${JSON.stringify(result)}`);
  }
  if (!online.names.includes("cardscore-v7")) throw new Error("cardscore-v7 is missing");
  if (online.urls.some(url => url.includes("/Task/"))) throw new Error("Task documentation was cached");

  await send("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
    connectionType: "none"
  });
  await send("Page.reload", { ignoreCache: false });
  await new Promise(resolve => setTimeout(resolve, 1500));
  result = await send("Runtime.evaluate", {
    expression: `({
      title: document.title,
      hub: Boolean(document.getElementById("gameHubPanel")),
      mariage: Boolean(window.Mariage),
      poker: Boolean(window.Poker),
      offline: !navigator.onLine
    })`,
    returnByValue: true
  });
  const offline = result.result.value;
  if (!offline.hub || !offline.mariage || !offline.poker || !offline.offline) {
    throw new Error("Offline application-shell reload failed");
  }
  socket.close();
  console.log(JSON.stringify({ online, offline }));
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
