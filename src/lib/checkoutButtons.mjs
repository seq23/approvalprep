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

export const CHECKOUT_FAILED = "The payment page did not open, and you have not been charged. Check your connection and press the button again. If it keeps happening, email info@approvalprep.com.";

// Asks the server for the Stripe page. Every failure becomes a sentence a customer can act on: the
// server's own message when it sent one (a wrong promo code, say), otherwise CHECKOUT_FAILED. A
// dropped connection used to print the browser's own words, "Failed to fetch".
export async function openCheckout(fetchImpl, request) {
  let response;
  try {
    response = await fetchImpl("/api/create-checkout-session", request);
  } catch {
    throw new Error(CHECKOUT_FAILED);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.checkoutUrl) throw new Error(payload.message || CHECKOUT_FAILED);
  return payload.checkoutUrl;
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
      window.location.href = await openCheckout(fetch, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku: button.dataset.sku, discount_code })
      });
    } catch (error) {
      restoreCheckoutButtons([button]);
      status.textContent = error.message;
    }
  });
}
