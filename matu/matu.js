(async () => {
  const shared = window.BacPodcastUtils;
  const data = document.body.dataset;
  const pageData = window.BacPodcastPageData || {};
  const [rawPodcastData, summaryData, quizLinks] = await Promise.all([
    pageData.podcastData ?? shared.loadJsonData({
      selector: "#podcastData",
      url: data.podcastData,
      fallback: [],
    }),
    pageData.summaryData ?? shared.loadJsonData({
      selector: "#summaryData",
      url: data.summaryData,
      fallback: {},
    }),
    pageData.quizLinks ?? shared.loadJsonData({
      selector: "#quizLinks",
      url: data.quizLinks,
      fallback: {},
    }),
  ]);
  const workIndexes = new Map();
  const podcastData = rawPodcastData.map((podcast, index) => {
    const workIndex = workIndexes.get(podcast.work) || 0;
    workIndexes.set(podcast.work, workIndex + 1);
    return {
      ...podcast,
      section: podcast.work,
      order: index,
      id: podcast.id || shared.makeSlug(`matu-${podcast.work}-${podcast.series || ""}-${podcast.title}-${workIndex}`),
      dateValue: shared.parseFrenchDateValue(podcast.date),
      searchable: shared.normalizeSearchText([
        podcast.work,
        podcast.author,
        podcast.title,
        podcast.series,
        podcast.origin,
        podcast.date,
      ].filter(Boolean).join(" ")),
    };
  });

  const sections = [...new Set(podcastData.map((podcast) => podcast.work))];

  window.BacPodcastPage.init({
    podcasts: podcastData,
    sections,
    summaryData,
    quizLinks,
    gridClass: "matu-grid",
    renderSummary: shared.renderSummaryContent,
  });
})().catch((error) => {
  console.error(error);
});
