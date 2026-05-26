export interface Movie {
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  release_date: string | null;
  vote_average: number | null;
  genres_text: string | null;
}

export interface CastMember {
  name: string;
  character: string;
  profile_path: string;
}

export interface StreamingProvider {
  name: string;
  id?: number;
  logo: string;
}

export interface RegionProviders {
  flatrate?: StreamingProvider[];
  rent?: StreamingProvider[];
  buy?: StreamingProvider[];
  link?: string;
}

export interface MovieDetail extends Movie {
  overview: string | null;
  backdrop_url: string | null;
  runtime: number | null;
  tagline: string | null;
  director: string | null;
  top_cast: CastMember[] | null;
  trailer_youtube_key: string | null;
  streaming_providers: Record<string, RegionProviders> | null;
  mpaa_rating: string | null;
  vote_count: number | null;
}

export interface Recommendation extends Movie {
  overview: string | null;
  similarity: number;
}
