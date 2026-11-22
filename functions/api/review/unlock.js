// POST /api/review/unlock { code, app_user_id }: the Play reviewer's 7-day Complete Bundle grant. See functions/_runtime/review.js.
import { reviewUnlock } from '../../_runtime/review.js';
export const onRequestPost = ({ request, env, waitUntil }) => reviewUnlock(request, env, { waitUntil });
