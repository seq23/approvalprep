function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const sku = String(body.sku || "").trim();
  const downloadUrl = String(body.downloadUrl || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Valid email is required." }, 400);
  if (!sku || !downloadUrl) return json({ error: "SKU and verified download URL are required." }, 400);
  if (!context.env.RESEND_API_KEY) return json({ status: "NOT_CONFIGURED", message: "Resend API key is missing." }, 501);

  const from = context.env.EMAIL_FROM || "ApprovalPrep <hello@approvalprep.com>";
  const replyTo = context.env.EMAIL_REPLY_TO || "hello@approvalprep.com";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${context.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      reply_to: replyTo,
      subject: "Your ApprovalPrep download is ready",
      text: `Your ${sku} download is ready: ${downloadUrl}\n\nApprovalPrep gives self-service tools only. We do not contact bureaus, landlords, lenders, employers, or creditors for you.`
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json({ status: "SOURCE_ERROR", provider: "resend", message: data.message || data.error || "Resend email failed." }, 502);
  return json({ status: "SENT", providerId: data.id || null });
}
