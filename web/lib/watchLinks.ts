import type { StreamingProvider } from "@/lib/types";

type WatchAction = "stream" | "rentOrBuy";

export interface WatchLinkContext {
  provider: StreamingProvider;
  title: string;
  releaseYear?: string;
  region: string;
  action: WatchAction;
  fallbackUrl?: string;
}

interface ProviderLink {
  href: string;
  source: "service" | "tmdb";
}

type ProviderLinkBuilder = (
  query: string,
  context: WatchLinkContext,
) => string;

const providerSearchLinks: Record<number, ProviderLinkBuilder> = {
  2: appleTvSearch,
  3: googlePlayMovieSearch,
  7: fandangoAtHomeSearch,
  8: netflixSearch,
  10: amazonVideoSearch,
  15: huluSearch,
  35: rakutenTvSearch,
  68: microsoftStoreSearch,
  73: tubiSearch,
  119: primeVideoSearch,
  192: youtubeRentBuySearch,
  207: rokuSearch,
  300: plutoTvSearch,
  384: hboMaxSearch,
  337: disneyPlusSearch,
  350: appleTvSearch,
  386: peacockSearch,
  387: peacockSearch,
  531: paramountPlusSearch,
  1899: maxSearch,
};

const nameSearchLinks: Array<[RegExp, ProviderLinkBuilder]> = [
  [/apple tv/i, appleTvSearch],
  [/netflix/i, netflixSearch],
  [/amazon prime|prime video/i, primeVideoSearch],
  [/amazon video/i, amazonVideoSearch],
  [/google play/i, googlePlayMovieSearch],
  [/youtube/i, youtubeRentBuySearch],
  [/fandango|vudu/i, fandangoAtHomeSearch],
  [/disney/i, disneyPlusSearch],
  [/hulu/i, huluSearch],
  [/hbo\s*max|hbomax/i, hboMaxSearch],
  [/\bmax\b/i, maxSearch],
  [/paramount/i, paramountPlusSearch],
  [/peacock/i, peacockSearch],
  [/rakuten/i, rakutenTvSearch],
  [/\btod\b|tod\s*tv/i, todTvSearch],
  [/tv\s*\+|tvplus|turkcell\s*tv/i, tvPlusSearch],
  [/microsoft/i, microsoftStoreSearch],
  [/tubi/i, tubiSearch],
  [/roku/i, rokuSearch],
  [/pluto/i, plutoTvSearch],
  [/mubi/i, mubiSearch],
  [/kanopy/i, kanopySearch],
  [/hoopla/i, hooplaSearch],
  [/plex/i, plexSearch],
];

function encoded(value: string) {
  return encodeURIComponent(value);
}

function normalizedRegion(region: string) {
  return region.trim().toLowerCase();
}

function searchTerms({
  title,
  releaseYear,
}: Pick<WatchLinkContext, "title" | "releaseYear">) {
  return [title, releaseYear].filter(Boolean).join(" ");
}

function titleOnly(context: WatchLinkContext) {
  return context.title.trim();
}

function appleTvSearch(query: string, context: WatchLinkContext) {
  const region = normalizedRegion(context.region);
  return `https://tv.apple.com/${region}/search?term=${encoded(query)}`;
}

function netflixSearch(query: string) {
  return `https://www.netflix.com/search?q=${encoded(query)}`;
}

function primeVideoSearch(query: string) {
  return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encoded(query)}`;
}

function amazonVideoSearch(query: string, context: WatchLinkContext) {
  if (context.region.toUpperCase() === "US") {
    return `https://www.amazon.com/s?k=${encoded(query)}&i=instant-video`;
  }
  return primeVideoSearch(query);
}

function googlePlayMovieSearch(query: string) {
  return `https://play.google.com/store/search?q=${encoded(query)}&c=movies`;
}

function youtubeRentBuySearch(query: string) {
  return `https://www.youtube.com/results?search_query=${encoded(`${query} movie`)}`;
}

function fandangoAtHomeSearch(query: string) {
  return `https://athome.fandango.com/content/movies/search?searchString=${encoded(query)}`;
}

function disneyPlusSearch(query: string) {
  return `https://www.disneyplus.com/search?q=${encoded(query)}`;
}

function huluSearch(query: string) {
  return `https://www.hulu.com/search?q=${encoded(query)}`;
}

function maxSearch(query: string, context: WatchLinkContext) {
  if (context.region.toUpperCase() === "TR") {
    return hboMaxSearch(query, context);
  }
  return `https://www.max.com/search?q=${encoded(query)}`;
}

function hboMaxSearch(query: string, context: WatchLinkContext) {
  const search = titleOnly(context) || query;
  return `https://www.hbomax.com/tr/en/search?q=${encoded(search)}`;
}

function paramountPlusSearch(query: string) {
  return `https://www.paramountplus.com/search/?q=${encoded(query)}`;
}

function peacockSearch(query: string) {
  return `https://www.peacocktv.com/search?q=${encoded(query)}`;
}

function rakutenTvSearch(query: string) {
  return `https://www.rakuten.tv/search?q=${encoded(query)}`;
}

function todTvSearch(query: string, context: WatchLinkContext) {
  const search = titleOnly(context) || query;
  return `https://www.todtv.com.tr/arama?q=${encoded(search)}`;
}

function tvPlusSearch(query: string, context: WatchLinkContext) {
  const search = titleOnly(context) || query;
  return `https://tvplus.com.tr/arama?q=${encoded(search)}`;
}

function microsoftStoreSearch(query: string) {
  return `https://www.microsoft.com/store/search/movies?q=${encoded(query)}`;
}

function tubiSearch(query: string) {
  return `https://tubitv.com/search/${encoded(query)}`;
}

function rokuSearch(query: string) {
  return `https://therokuchannel.roku.com/search/${encoded(query)}`;
}

function plutoTvSearch(query: string) {
  return `https://pluto.tv/search/details/${encoded(query)}`;
}

function mubiSearch(query: string) {
  return `https://mubi.com/search?q=${encoded(query)}`;
}

function kanopySearch(query: string) {
  return `https://www.kanopy.com/search?query=${encoded(query)}`;
}

function hooplaSearch(query: string) {
  return `https://www.hoopladigital.com/search?q=${encoded(query)}&scope=everything&type=direct`;
}

function plexSearch(query: string) {
  return `https://watch.plex.tv/search?q=${encoded(query)}`;
}

function findProviderBuilder(provider: StreamingProvider) {
  if (typeof provider.id === "number" && providerSearchLinks[provider.id]) {
    return providerSearchLinks[provider.id];
  }

  return nameSearchLinks.find(([matcher]) => matcher.test(provider.name))?.[1];
}

export function getWatchProviderLink(
  context: WatchLinkContext,
): ProviderLink | null {
  const query = searchTerms(context);
  const builder = findProviderBuilder(context.provider);

  if (query && builder) {
    return {
      href: builder(query, context),
      source: "service",
    };
  }

  if (context.fallbackUrl) {
    return {
      href: context.fallbackUrl,
      source: "tmdb",
    };
  }

  return null;
}
