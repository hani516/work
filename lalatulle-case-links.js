// Keep links to the former one-page LaLaTulle portfolio working.
const caseAnchors = {
  halloween: [
    'category-redesign', 'banner-refresh', 'category-sequence', 'footer-additions',
    'google-search-label', 'google-search-query'
  ],
  navigation: ['header-priorities', 'header-icon-captions'],
  'first-view': ['carousel-decision-title', 'search-decision-title'],
  experiment: ['test-limitations-title']
};

function openLegacyCaseLink() {
  const id = location.hash.slice(1);
  const match = Object.entries(caseAnchors).find(([slug, aliases]) =>
    id === slug || id.startsWith(slug + '-') || aliases.includes(id));
  if (!match) return;

  const [slug] = match;
  location.replace(`lalatulle-${slug}.html${id === slug ? '' : location.hash}`);
}

openLegacyCaseLink();
addEventListener('hashchange', openLegacyCaseLink);
