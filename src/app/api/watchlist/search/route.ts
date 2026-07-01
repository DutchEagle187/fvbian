import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchResult {
  sourceId: string;
  type: "movie" | "tv" | "book";
  title: string;
  year?: string;
  poster?: string;
  subtitle?: string;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const type = params.get("type") as "movie" | "tv" | "book" | null;
  const q = params.get("q")?.trim();
  if (!q || !type) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (type === "book") {
      return NextResponse.json({ results: await searchBooks(q) });
    }
    const key = process.env.TMDB_API_KEY;
    if (!key) {
      return NextResponse.json({
        results: [],
        error: "TMDb-API-Key fehlt (TMDB_API_KEY).",
      });
    }
    return NextResponse.json({ results: await searchTmdb(type, q, key) });
  } catch (e) {
    return NextResponse.json(
      { results: [], error: (e as Error).message },
      { status: 502 }
    );
  }
}

async function searchTmdb(
  type: "movie" | "tv",
  q: string,
  key: string
): Promise<SearchResult[]> {
  const url = `https://api.themoviedb.org/3/search/${type}?api_key=${key}&language=de-DE&include_adult=false&query=${encodeURIComponent(
    q
  )}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`TMDb ${res.status}`);
  const data = (await res.json()) as {
    results?: {
      id: number;
      title?: string;
      name?: string;
      release_date?: string;
      first_air_date?: string;
      poster_path?: string | null;
      overview?: string;
    }[];
  };
  return (data.results ?? []).slice(0, 12).map((r) => {
    const date = r.release_date || r.first_air_date || "";
    return {
      sourceId: `tmdb:${type}:${r.id}`,
      type,
      title: r.title || r.name || "Unbenannt",
      year: date ? date.slice(0, 4) : undefined,
      poster: r.poster_path
        ? `https://image.tmdb.org/t/p/w342${r.poster_path}`
        : undefined,
      subtitle: r.overview || undefined,
    };
  });
}

// Google Books has the best coverage + covers; fall back to Open Library
// on rate limits (429), errors, or empty results.
async function searchBooks(q: string): Promise<SearchResult[]> {
  try {
    const google = await searchGoogleBooks(q);
    if (google.length > 0) return google;
  } catch {
    // fall through to Open Library
  }
  return searchOpenLibrary(q);
}

async function searchGoogleBooks(q: string): Promise<SearchResult[]> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    q
  )}&maxResults=12&printType=books&country=CH${key ? `&key=${key}` : ""}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Google Books ${res.status}`);
  const data = (await res.json()) as {
    items?: {
      id: string;
      volumeInfo?: {
        title?: string;
        subtitle?: string;
        authors?: string[];
        publishedDate?: string;
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
        industryIdentifiers?: { type: string; identifier: string }[];
      };
    }[];
  };
  return (data.items ?? [])
    .filter((v) => v.volumeInfo?.title)
    .slice(0, 12)
    .map((v) => {
      const info = v.volumeInfo!;
      const thumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
      const isbn =
        info.industryIdentifiers?.find((i) => i.type === "ISBN_13") ??
        info.industryIdentifiers?.find((i) => i.type === "ISBN_10");
      const poster = thumb
        ? thumb.replace(/^http:/, "https:")
        : isbn
          ? `https://covers.openlibrary.org/b/isbn/${isbn.identifier}-M.jpg?default=false`
          : // Last resort: Google's cover-content endpoint by volume id.
            `https://books.google.com/books/content?id=${v.id}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
      return {
        sourceId: `gb:${v.id}`,
        type: "book" as const,
        title: info.title!,
        year: info.publishedDate?.slice(0, 4),
        poster,
        subtitle: info.authors?.join(", "),
      };
    });
}

async function searchOpenLibrary(q: string): Promise<SearchResult[]> {
  const url = `https://openlibrary.org/search.json?limit=12&fields=key,title,first_publish_year,cover_i,author_name&q=${encodeURIComponent(
    q
  )}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const data = (await res.json()) as {
    docs?: {
      key: string;
      title: string;
      first_publish_year?: number;
      cover_i?: number;
      author_name?: string[];
    }[];
  };
  return (data.docs ?? []).slice(0, 12).map((d) => ({
    sourceId: `ol:${d.key}`,
    type: "book" as const,
    title: d.title,
    year: d.first_publish_year ? String(d.first_publish_year) : undefined,
    poster: d.cover_i
      ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
      : undefined,
    subtitle: d.author_name?.[0],
  }));
}
