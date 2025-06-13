const filterSites = (
  sites: {
    link: string;
    title: string;
    snippet: string;
  }[],
) => {
  return sites.filter((site) => {
    return (
      !site.link.includes('yandex.') &&
      !site.link.includes('avito') &&
      !site.link.includes('ozon') &&
      !site.link.includes('wildberries') &&
      !site.link.includes('aliexpress') &&
      !site.link.includes('.pdf') &&
      !site.link.includes('.xlsx') &&
      !site.link.includes('.xls') &&
      (site.link.includes('.ru') || site.link.includes('.рф'))
    );
  });
};

export default filterSites;
