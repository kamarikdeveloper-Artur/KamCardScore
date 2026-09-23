"use strict";

const fs = require("node:fs");
const path = require("node:path");

async function run() {
  const port = process.env.CDP_PORT || "9225";
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = tabs.find(item => item.type === "page" && item.url === "http://127.0.0.1:8765/");
  if (!page) throw new Error("CardScore tab not found");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };

  await send("Page.enable");
  await evaluate(`(() => {
    const M = window.Mariage;
    const state = M.createGame({
      id: "browser-history-icons", startedAt: new Date().toISOString(), skiMode: "three", repaintMode: "three",
      players: ["p1", "p2", "p3"].map(id => ({ id, name: id.toUpperCase() }))
    });
    const play = results => {
      state.activeRound = M.createRound(state);
      state.activeRound.orderingPlayerId = "p3";
      state.activeRound.orderPoints = 100;
      state.activeRound.phase = "results";
      M.resolvePlayerResult(state, "p1", results.p1, null);
      M.resolvePlayerResult(state, "p2", results.p2, null);
      M.resolvePlayerResult(state, "p3", null, "taken");
    };
    play({ p1: 420, p2: 420 });
    play({ p1: 410, p2: 410 });
    play({ p1: 50, p2: 40 });
    play({ p1: 10, p2: 20 });
    play({ p1: 120, p2: 10 });
    localStorage.setItem("cardscore.currentGame.mariage", JSON.stringify(state));
    document.querySelector('[data-game-id="mariage"]').click();
    document.getElementById("mariageMenuContinueButton").click();
  })()`);
  await new Promise(resolve => setTimeout(resolve, 500));
  const inspect = () => evaluate(`(() => ({
    active: document.querySelectorAll(".mariage-barrel-icon--active").length,
    inactive: document.querySelectorAll(".mariage-barrel-icon--inactive").length,
    visibleGame: !document.getElementById("mariageGamePanel").classList.contains("hidden"),
    successRequests: performance.getEntriesByType("resource").filter(entry => entry.name.includes("success.svg")).length,
    barrelRequests: performance.getEntriesByType("resource").filter(entry => entry.name.includes("icon_barrel.svg")).length
  }))()`);
  let state = await inspect();
  if (!state.visibleGame || state.active !== 1 || state.inactive !== 2 || state.successRequests !== 0 || state.barrelRequests < 1) {
    throw new Error(`Unexpected initial icon state: ${JSON.stringify(state)}`);
  }

  await send("Page.reload", { ignoreCache: false });
  await new Promise(resolve => setTimeout(resolve, 700));
  await evaluate(`(() => {
    document.querySelector('[data-game-id="mariage"]').click();
    document.getElementById("mariageMenuContinueButton").click();
  })()`);
  await new Promise(resolve => setTimeout(resolve, 500));
  state = await inspect();
  if (!state.visibleGame || state.active !== 1 || state.inactive !== 2 || state.successRequests !== 0) {
    throw new Error(`Unexpected reloaded icon state: ${JSON.stringify(state)}`);
  }

  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const output = path.resolve(__dirname, "cs0017c-browser-qa.png");
  fs.writeFileSync(output, Buffer.from(screenshot.data, "base64"));
  socket.close();
  console.log(JSON.stringify({ ...state, screenshot: output }));
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
