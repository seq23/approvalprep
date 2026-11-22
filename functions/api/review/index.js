// GET /api/review: 200 {open:true} while a Play review window is open, else 404. See functions/_runtime/review.js.
import { reviewStatus } from '../../_runtime/review.js';
export const onRequestGet = ({ env }) => reviewStatus(env);
