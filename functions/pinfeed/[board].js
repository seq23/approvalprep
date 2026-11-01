// /pinfeed/<board>.xml at REQUEST time: one RSS feed per Pinterest topic board after
// the first (data/pinterest/boards.json). Pinterest maps one feed to one board, so each
// is connected to its own board in Pinterest's auto-publish settings. Unknown boards 404.
import feed from "../../data/pinterest/pinfeed.json";
import queue from "../../data/pinterest/queue.json";
import boardsConfig from "../../data/pinterest/boards.json";
import { pinBoards, renderBoardFeedAt } from "../../src/lib/pinfeed-core.mjs";

const boards = pinBoards(boardsConfig);

export const onRequestGet = ({ params }) => {
  const board = boards.boardByFeedPath(`/pinfeed/${params.board}`);
  if (!board || board.slug === boards.MAIN_BOARD.slug) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(renderBoardFeedAt(feed, queue, boards, board, new Date()), {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=900", "x-pinfeed-mode": "request-time" },
  });
};

export const onRequestHead = (ctx) => {
  const res = onRequestGet(ctx);
  return new Response(null, { status: res.status, headers: res.headers });
};
