(function () {
  "use strict";

  const DEFAULT_ITEM_HEIGHT = 48;

  function getInitialSelectedValue(values, selectedValue, isValueAllowed) {
    const normalizedValues = Array.isArray(values) ? values.slice() : [];
    if (normalizedValues.includes(selectedValue)) return selectedValue;

    const firstAllowed = normalizedValues.find(function (value) {
      return isValueAllowed(value);
    });
    return firstAllowed === undefined ? normalizedValues[0] : firstAllowed;
  }

  function create(options) {
    const viewport = options.viewport;
    const confirmButton = options.confirmButton;
    const cancelButton = options.cancelButton;
    let configuration = null;
    let selectedValue = null;
    let externalConfirmationAllowed = true;
    let scrollFrame = null;
    let settleTimer = null;

    function getItems() {
      return Array.from(viewport.querySelectorAll(".wheel-picker-item"));
    }

    function isSelectedValueAllowed() {
      return Boolean(
        configuration &&
        configuration.isValueAllowed(selectedValue) &&
        externalConfirmationAllowed,
      );
    }

    function renderSelection() {
      getItems().forEach(function (item) {
        const isSelected = Number(item.dataset.value) === selectedValue;
        item.classList.toggle("wheel-picker-item--selected", isSelected);
        item.setAttribute("aria-selected", String(isSelected));
        if (isSelected) {
          viewport.setAttribute("aria-activedescendant", item.id);
        }
      });

      confirmButton.disabled = !isSelectedValueAllowed();

      if (configuration && configuration.onSelectionChange) {
        const valueAllowed = Boolean(
          configuration.isValueAllowed(selectedValue),
        );
        configuration.onSelectionChange(selectedValue, valueAllowed);
      }
    }

    function setSelectedValue(value, scrollBehavior) {
      if (!configuration || !configuration.values.includes(value)) return;
      selectedValue = value;
      renderSelection();

      const item = getItems().find(function (candidate) {
        return Number(candidate.dataset.value) === value;
      });
      if (item) {
        viewport.scrollTo({
          top: item.offsetTop - (viewport.clientHeight - item.offsetHeight) / 2,
          behavior: scrollBehavior || "auto",
        });
      }
    }

    function selectCenteredItem() {
      const items = getItems();
      if (!items.length) return;
      const center = viewport.scrollTop + viewport.clientHeight / 2;
      const centeredItem = items.reduce(function (nearest, item) {
        const itemCenter = item.offsetTop + item.offsetHeight / 2;
        const nearestCenter = nearest.offsetTop + nearest.offsetHeight / 2;
        return Math.abs(itemCenter - center) < Math.abs(nearestCenter - center)
          ? item
          : nearest;
      }, items[0]);
      const centeredValue = Number(centeredItem.dataset.value);
      if (centeredValue !== selectedValue) {
        selectedValue = centeredValue;
        renderSelection();
      }
      return centeredItem;
    }

    function handleScroll() {
      if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(function () {
        scrollFrame = null;
        selectCenteredItem();
      });

      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () {
        const centeredItem = selectCenteredItem();
        if (!centeredItem) return;
        viewport.scrollTo({
          top:
            centeredItem.offsetTop -
            (viewport.clientHeight - centeredItem.offsetHeight) / 2,
          behavior: "smooth",
        });
      }, 90);
    }

    function configure(nextConfiguration) {
      configuration = {
        values: nextConfiguration.values.slice(),
        isValueAllowed: nextConfiguration.isValueAllowed,
        onConfirm: nextConfiguration.onConfirm,
        onCancel: nextConfiguration.onCancel,
        onSelectionChange: nextConfiguration.onSelectionChange,
      };
      externalConfirmationAllowed = nextConfiguration.canConfirm !== false;
      viewport.replaceChildren();

      configuration.values.forEach(function (value) {
        const isAllowed = configuration.isValueAllowed(value);
        const item = document.createElement("button");
        item.className = `wheel-picker-item wheel-picker-item--${isAllowed ? "allowed" : "blocked"}`;
        item.type = "button";
        item.role = "option";
        item.tabIndex = -1;
        item.id = `wheel-picker-value-${value}`;
        item.dataset.value = String(value);
        item.textContent = String(value);
        item.setAttribute("aria-disabled", String(!isAllowed));
        item.setAttribute(
          "aria-label",
          `${value}, ${isAllowed ? "доступно" : "недоступно"}`,
        );
        item.addEventListener("click", function () {
          setSelectedValue(value, "smooth");
        });
        viewport.appendChild(item);
      });

      const initialValue = getInitialSelectedValue(
        configuration.values,
        nextConfiguration.selectedValue,
        configuration.isValueAllowed,
      );
      selectedValue = Number.isInteger(initialValue) ? initialValue : null;
      renderSelection();
      requestAnimationFrame(function () {
        if (selectedValue !== null) setSelectedValue(selectedValue, "auto");
      });
    }

    function setConfirmationAvailable(isAvailable) {
      externalConfirmationAllowed = Boolean(isAvailable);
      renderSelection();
    }

    function reset() {
      configuration = null;
      selectedValue = null;
      externalConfirmationAllowed = true;
      clearTimeout(settleTimer);
      if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
      scrollFrame = null;
      viewport.replaceChildren();
      viewport.removeAttribute("aria-activedescendant");
      confirmButton.disabled = true;
    }

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    viewport.addEventListener("keydown", function (event) {
      if (
        !configuration ||
        !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
      ) {
        return;
      }
      event.preventDefault();
      let index = configuration.values.indexOf(selectedValue);
      if (event.key === "ArrowUp") index -= 1;
      if (event.key === "ArrowDown") index += 1;
      if (event.key === "Home") index = 0;
      if (event.key === "End") index = configuration.values.length - 1;
      index = Math.max(0, Math.min(configuration.values.length - 1, index));
      setSelectedValue(configuration.values[index], "smooth");
    });
    confirmButton.addEventListener("click", function () {
      if (!configuration || !isSelectedValueAllowed()) return;
      configuration.onConfirm(selectedValue);
    });
    cancelButton.addEventListener("click", function () {
      if (configuration && configuration.onCancel) configuration.onCancel();
    });

    return {
      configure,
      getSelectedValue: function () {
        return selectedValue;
      },
      setConfirmationAvailable,
      setSelectedValue,
      reset,
      itemHeight: DEFAULT_ITEM_HEIGHT,
    };
  }

  window.CardScoreWheelPicker = Object.freeze({
    create,
    getInitialSelectedValue,
  });
})();
