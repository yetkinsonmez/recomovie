import type { RegionProviders, StreamingProvider } from "@/lib/types";
import { getWatchProviderLink } from "@/lib/watchLinks";

const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

function ProviderTile({
  provider,
  href,
  linkSource,
}: {
  provider: StreamingProvider;
  href?: string;
  linkSource?: "service" | "tmdb";
}) {
  const content = (
    <>
      {provider.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${TMDB_LOGO_BASE}${provider.logo}`}
          alt={provider.name}
          loading="lazy"
        />
      ) : (
        <div className="provider-tile-fallback">{provider.name}</div>
      )}
      <span className="provider-tile-name">{provider.name}</span>
    </>
  );

  if (href) {
    return (
      <a
        className="provider-tile"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={
          linkSource === "service"
            ? `Open ${provider.name}`
            : `Open ${provider.name} on TMDB`
        }
      >
        {content}
      </a>
    );
  }
  return (
    <div className="provider-tile" title={provider.name}>
      {content}
    </div>
  );
}

function ProviderChip({
  provider,
  href,
  linkSource,
}: {
  provider: StreamingProvider;
  href?: string;
  linkSource?: "service" | "tmdb";
}) {
  const content = (
    <>
      {provider.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${TMDB_LOGO_BASE}${provider.logo}`}
          alt=""
          loading="lazy"
        />
      )}
      {provider.name}
    </>
  );

  if (href) {
    return (
      <a
        className="provider-chip"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={
          linkSource === "service"
            ? `Open ${provider.name}`
            : `Open ${provider.name} on TMDB`
        }
      >
        {content}
      </a>
    );
  }
  return (
    <span className="provider-chip" title={provider.name}>
      {content}
    </span>
  );
}

function dedupeBy<T, K>(items: T[], key: (item: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export function WatchProviders({
  providers,
  region,
  title,
  releaseYear,
}: {
  providers: RegionProviders;
  region: string;
  title: string;
  releaseYear?: string;
}) {
  const stream = providers.flatrate ?? [];
  const rentOrBuy = dedupeBy(
    [...(providers.rent ?? []), ...(providers.buy ?? [])],
    (p) => p.id ?? p.name,
  );
  const link = providers.link;

  const getLink = (
    provider: StreamingProvider,
    action: "stream" | "rentOrBuy",
  ) =>
    getWatchProviderLink({
      provider,
      title,
      releaseYear,
      region,
      action,
      fallbackUrl: link,
    });

  return (
    <div className="watch-block">
      <p className="watch-region-label">Streaming in {region}</p>

      {stream.length > 0 ? (
        <div className="provider-tiles">
          {stream.map((provider) => {
            const providerLink = getLink(provider, "stream");
            return (
              <ProviderTile
                key={provider.id ?? provider.name}
                provider={provider}
                href={providerLink?.href}
                linkSource={providerLink?.source}
              />
            );
          })}
        </div>
      ) : (
        <p className="watch-empty">Not on a streaming service in {region}.</p>
      )}

      {rentOrBuy.length > 0 && (
        <div className="rent-buy-row">
          <span className="rent-buy-label">Rent or buy</span>
          <div className="provider-chips">
            {rentOrBuy.map((provider) => {
              const providerLink = getLink(provider, "rentOrBuy");
              return (
                <ProviderChip
                  key={provider.id ?? provider.name}
                  provider={provider}
                  href={providerLink?.href}
                  linkSource={providerLink?.source}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
