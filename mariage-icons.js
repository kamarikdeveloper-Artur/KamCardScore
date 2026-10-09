(function () {
  "use strict";

  const REGISTRY = Object.freeze({
    success: Object.freeze({
      fallback: "OK",
      asset: "assets/icons/icon-checked.svg",
    }),
    bite: Object.freeze({ fallback: "Б", asset: null }),
    biteSki: Object.freeze({ fallback: "Б+Л", asset: null }),
    ski: Object.freeze({ fallback: "Л", asset: null }),
    repaint: Object.freeze({
      fallback: "Р",
      asset: "assets/icons/icon-edit-table.svg",
    }),
    repaintBeneficiary: Object.freeze({ fallback: "+", asset: null }),
    exact555Reset: Object.freeze({ fallback: "555", asset: null }),
    barrel: Object.freeze({
      fallback: "Бч",
      asset: "assets/icons/icon_barrel.svg",
    }),
  });

  function describeResult(result, rules, context) {
    const presentation = context || {};
    if (!result) return { type: "empty", text: "--" };
    if (presentation.exact555Reset) {
      return {
        type: "exact555Reset",
        semantic: "exact555Reset",
        text: "555",
        label: "Рівно 555 — рахунок скинуто до 0",
        ...REGISTRY.exact555Reset,
      };
    }
    if (result.semantic.repaintBeneficiary) {
      const amount = Number(result.delta);
      const fallback = Number.isFinite(amount)
        ? `${amount >= 0 ? "+" : ""}${amount}`
        : REGISTRY.repaintBeneficiary.fallback;
      return {
        type: "semantic",
        semantic: "repaintBeneficiary",
        ...REGISTRY.repaintBeneficiary,
        fallback,
      };
    }
    if (result.semantic.repaint) {
      return {
        type: "semantic",
        semantic: "repaint",
        ...REGISTRY.repaint,
        badge:
          rules.repaint.penaltyMode === "three"
            ? result.repaintCycleNumber
            : null,
      };
    }
    if (result.semantic.bite && result.semantic.ski) {
      return {
        type: "semantic",
        semantic: "biteSki",
        ...REGISTRY.biteSki,
        badge: rules.skiMode === "three" ? result.skiCycleNumber : null,
      };
    }
    if (result.semantic.bite)
      return { type: "semantic", semantic: "bite", ...REGISTRY.bite };
    if (result.semantic.ski) {
      return {
        type: "semantic",
        semantic: "ski",
        ...REGISTRY.ski,
        badge: rules.skiMode === "three" ? result.skiCycleNumber : null,
      };
    }
    if (result.semantic.success)
      return { type: "semantic", semantic: "success", ...REGISTRY.success };
    if (result.actualPoints !== null && result.actualPoints !== undefined) {
      return { type: "factual", text: String(result.actualPoints) };
    }
    return { type: "empty", text: "--" };
  }

  function describeBarrel(active) {
    return {
      type: "barrel",
      semantic: "barrel",
      active: Boolean(active),
      ...REGISTRY.barrel,
    };
  }

  function describeCell(options) {
    if (options.barrel) return options.barrel;
    return describeResult(options.result, options.rules, {
      exact555Reset: options.exact555Reset,
    });
  }

  function appendBadge(container, badge) {
    if (badge === null || badge === undefined) return;
    const element = document.createElement("span");
    element.className = "mariage-status-badge";
    element.textContent = String(badge);
    container.appendChild(element);
  }

  function renderFallback(container, descriptor) {
    const fallback = document.createElement("span");
    fallback.className = "mariage-status-fallback";
    fallback.textContent = descriptor.fallback;
    container.appendChild(fallback);
    return fallback;
  }

  function renderStatus(cell, descriptor) {
    if (descriptor.type === "empty" || descriptor.type === "factual") {
      cell.textContent = descriptor.text;
      return;
    }
    if (descriptor.type === "exact555Reset") {
      const container = document.createElement("span");
      const value = document.createElement("span");
      container.className = "mariage-result mariage-result--exact555";
      container.setAttribute("role", "img");
      container.setAttribute("aria-label", descriptor.label);
      container.title = descriptor.label;
      value.className = "mariage-result-value";
      value.textContent = descriptor.text;
      container.appendChild(value);
      cell.appendChild(container);
      return;
    }
    const container = document.createElement("span");
    container.className = `mariage-status-icon mariage-status-icon--${descriptor.semantic}`;
    const fallback = renderFallback(container, descriptor);
    if (descriptor.asset) {
      const image = document.createElement("img");
      image.className = "mariage-result-icon hidden";
      image.alt = descriptor.fallback;
      image.addEventListener("load", function () {
        image.classList.remove("hidden");
        fallback.classList.add("hidden");
      });
      image.addEventListener("error", function () {
        image.remove();
      });
      image.src = descriptor.asset;
      container.appendChild(image);
    }
    appendBadge(container, descriptor.badge);
    cell.appendChild(container);
  }

  function renderBarrel(cell, descriptor) {
    const icon = document.createElement("span");
    const fallback = renderFallback(icon, descriptor);
    const image = document.createElement("img");
    const label = descriptor.active ? "Бочка" : "Попередня Бочка";
    icon.className = `mariage-barrel-icon mariage-barrel-icon--${descriptor.active ? "active" : "inactive"}`;
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", label);
    icon.title = label;
    image.className = "hidden";
    image.src = descriptor.asset;
    image.alt = "";
    image.addEventListener("load", function () {
      image.classList.remove("hidden");
      fallback.classList.add("hidden");
    });
    image.addEventListener("error", function () {
      image.remove();
    });
    icon.appendChild(image);
    cell.appendChild(icon);
  }

  function renderCell(cell, descriptor) {
    if (descriptor.type === "barrel") renderBarrel(cell, descriptor);
    else renderStatus(cell, descriptor);
  }

  window.MariageStatusIcons = Object.freeze({
    REGISTRY,
    describeResult,
    describeBarrel,
    describeCell,
    renderStatus,
    renderBarrel,
    renderCell,
  });
})();
