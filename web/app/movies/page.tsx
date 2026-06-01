import { BrowseResults } from "@/components/BrowseResults";

export const revalidate = 3600;

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    genre?: string;
  }>;
}) {
  const sp = await searchParams;

  return <BrowseResults searchParams={sp} />;
}
