/**
 * Published answers that target a given route.
 *
 * data/content/generated_answers.json is already the site's authored Q&A: every
 * record is a question in `title` and its answer in `answer`, and every record
 * carries a `route` naming the page it was written about. Those answers were
 * only ever rendered on their own /blog/ page, so the page each one is about -
 * the tool, the report, the methodology page - carried no question-and-answer
 * content at all and no FAQPage schema. This joins them back to their target.
 *
 * Nothing is generated here. A route with no published answers returns an empty
 * array and its page renders no FAQ block, rather than being given invented
 * questions to satisfy a coverage number.
 *
 * `status` matters: the file also holds `redirected_to_canonical` and
 * `approval_required` records. Only `published_by_contract` is live content, and
 * surfacing either of the others would publish material the release contract has
 * not cleared.
 */
import answersData from "../../data/content/generated_answers.json";

export interface RouteAnswer {
  question: string;
  answer: string;
  href: string;
}

// Must stay identical to the slug function in src/pages/blog/[slug].astro, or
// "Read the full answer" links 404.
const toSlug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);

export function routeAnswers(route: string): RouteAnswer[] {
  return answersData.answers
    .filter((a: any) => a.status === "published_by_contract" && a.route === route)
    .map((a: any) => ({
      question: a.title,
      answer: a.answer,
      href: `/blog/${toSlug(a.title)}`
    }));
}
