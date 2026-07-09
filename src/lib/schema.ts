export const orgSchema = () => ({ "@context": "https://schema.org", "@type": "Organization", name: "ApprovalPrep", url: "https://approvalprep.com" });

export const webPageSchema = ({ title, description, url }: { title: string; description: string; url: string }) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: title,
  description,
  url,
  publisher: { "@type": "Organization", name: "ApprovalPrep", url: "https://approvalprep.com" }
});

export const articleSchema = ({ title, description, url, datePublished }: { title: string; description: string; url: string; datePublished?: string }) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  url,
  datePublished,
  author: { "@type": "Organization", name: "ApprovalPrep" },
  publisher: { "@type": "Organization", name: "ApprovalPrep", url: "https://approvalprep.com" }
});

export const faqSchema = (faq: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } }))
});

export const howToSchema = ({ name, steps }: { name: string; steps: string[] }) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name,
  step: steps.map((step, index) => ({ "@type": "HowToStep", position: index + 1, text: step }))
});

export const breadcrumbSchema = (path: string) => {
  const parts = path.split("/").filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "https://approvalprep.com" }, ...parts.map((part, index) => ({
      "@type": "ListItem",
      position: index + 2,
      name: part.replace(/-/g, " "),
      item: `https://approvalprep.com/${parts.slice(0, index + 1).join("/")}`
    }))]
  };
};

export const itemListSchema = ({ name, items }: { name: string; items: string[] }) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item }))
});

export const productSchema = ({ name, description, url, price }: { name: string; description: string; url: string; price?: string }) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name,
  description,
  url,
  ...(price ? { offers: { "@type": "Offer", priceCurrency: "USD", price: price.replace(/[^0-9.]/g, "") } } : {})
});
