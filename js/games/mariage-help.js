(function () {
  "use strict";

  const DEFAULT_URL = "data/mariage-help.uk.json";
  const FALLBACK_TEXT = "Опис правила ще не додано.";

  function normalizeEntry(entry, key) {
    const source = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
    return {
      key,
      title: typeof source.title === "string" && source.title.trim() ? source.title.trim() : "Довідка",
      shortText: typeof source.shortText === "string" && source.shortText.trim()
        ? source.shortText.trim() : FALLBACK_TEXT,
      paragraphs: Array.isArray(source.paragraphs)
        ? source.paragraphs.filter(function (paragraph) { return typeof paragraph === "string" && paragraph.trim(); })
          .map(function (paragraph) { return paragraph.trim(); })
        : [],
      example: typeof source.example === "string" ? source.example.trim() : ""
    };
  }

  function createStore(options) {
    const settings = options || {};
    const url = settings.url || DEFAULT_URL;
    const fetchData = settings.fetch || window.fetch.bind(window);
    let dataPromise = null;

    function load() {
      if (!dataPromise) {
        dataPromise = fetchData(url, { cache: "no-cache" })
          .then(function (response) {
            if (!response.ok) throw new Error("Mariage help is unavailable");
            return response.json();
          })
          .then(function (data) {
            return data && typeof data === "object" && !Array.isArray(data) ? data : {};
          })
          .catch(function () { return {}; });
      }
      return dataPromise;
    }

    function get(key) {
      return load().then(function (data) { return normalizeEntry(data[key], key); });
    }

    return { load, get, url };
  }

  window.MariageHelp = Object.freeze({
    DEFAULT_URL,
    FALLBACK_TEXT,
    normalizeEntry,
    createStore
  });
})();
