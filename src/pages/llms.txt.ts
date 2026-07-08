import type { APIRoute } from "astro";
export const GET: APIRoute = async () => new Response(`# ApprovalPrep

ApprovalPrep is a self-service approval prep site.

Core pages:
- https://approvalprep.com/letter-of-explanation
- https://approvalprep.com/employment-verification-letter
- https://approvalprep.com/credit-dispute-letter
- https://approvalprep.com/apartment-application

Boundary: We do not fix your credit for you. We do not contact credit bureaus, landlords, lenders, employers, or creditors for you. We give you self-service tools, letters, checklists, and step-by-step instructions so you can prepare and send your own paperwork.
`, { headers: { "content-type": "text/plain; charset=utf-8" } });
