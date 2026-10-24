(function () {
  "use strict";

  const drafts = new WeakMap();

  function render(options) {
    const container = options.container;
    const playerCount = options.playerCount;
    const idPrefix = options.idPrefix;
    const defaultName = options.defaultName || function (index) {
      return `Гравець ${index + 1}`;
    };
    const values = drafts.get(container) || [];

    Array.from(container.querySelectorAll("input")).forEach(function (input, index) {
      values[index] = input.value;
    });
    drafts.set(container, values);
    container.replaceChildren();

    for (let index = 0; index < playerCount; index += 1) {
      const wrapper = document.createElement("div");
      const label = document.createElement("label");
      const input = document.createElement("input");
      const inputId = `${idPrefix}${index + 1}`;

      wrapper.className = "name-field";
      label.className = "name-field-label";
      label.htmlFor = inputId;
      label.textContent = defaultName(index);
      input.className = "name-field-input";
      input.id = inputId;
      input.type = "text";
      input.maxLength = 10;
      input.value = values[index] || defaultName(index);
      input.addEventListener("input", function () {
        values[index] = input.value;
      });
      input.addEventListener("focus", function () {
        input.select();
      });

      wrapper.append(label, input);
      container.appendChild(wrapper);
    }
  }

  window.CardScorePlayerNameFields = Object.freeze({ render });
})();
