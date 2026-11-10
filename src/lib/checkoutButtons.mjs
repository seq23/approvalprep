// Buy buttons. Pressing one opens Stripe's payment page; coming Back from it must leave the button
// ready to press again (the browser restores the old page from memory with the button still
// disabled, so pageshow resets it). The status line sits under the button that was pressed.
export const OPENING_LABEL = "Opening the payment page…";

export function beginCheckout(button) {
  if (button.dataset.label === undefined) button.dataset.label = button.textContent;
  button.disabled = true;
  button.textContent = OPENING_LABEL;
}

export function restoreCheckoutButtons(buttons) {
  for (const button of buttons) {
    if (button.dataset.label === undefined) continue;
    button.textContent = button.dataset.label;
    button.disabled = false;
    delete button.dataset.label;
  }
}

function statusFor(button) {
  const next = button.nextElementSibling;
  if (next && next.classList.contains("checkout-status")) return next;
  const status = document.createElement("p");
  status.className = "fine checkout-status";
  status.setAttribute("aria-live", "polite");
  button.insertAdjacentElement("afterend", status);
  return status;
}

export function initCheckoutButtons() {
  const all = () => document.querySelectorAll(".checkout-button[data-sku]");
  window.addEventListener("pageshow", () => {
    restoreCheckoutButtons(all());
    for (const status of document.querySelectorAll(".checkout-status")) status.textContent = "";
  });
  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".checkout-button[data-sku]");
    if (!button || button.disabled) return;
    const status = statusFor(button);
    beginCheckout(button);
    status.textContent = "Opening Stripe’s secure payment page. Your letter answers and documents are never sent.";
    const discount_code = String(document.querySelector("[data-discount-code]")?.value || "").trim();
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku: button.dataset.sku, discount_code })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload.message || "The payment page could not open. Please try again.");
      window.location.href = payload.checkoutUrl;
    } catch (error) {
      restoreCheckoutButtons([button]);
      status.textContent = error.message || "The payment page could not open. Please try again.";
    }
  });
}
