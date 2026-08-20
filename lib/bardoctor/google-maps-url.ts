const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "g.co"]);

function isGoogleHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return SHORT_LINK_HOSTS.has(host)
    || host === "google.com"
    || host.endsWith(".google.com")
    || /^([a-z0-9-]+\.)*google\.[a-z.]{2,}$/i.test(host);
}

export type ParsedGoogleMapsUrl = {
  canonicalUrl: string;
  placeId?: string;
  cid?: string;
  lat?: string;
  lng?: string;
  name?: string;
};

export type GoogleMapsUrlParseError = { error: string };

async function resolveShortLink(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    await response.body?.cancel().catch(() => undefined);
    return response.url || url;
  } catch {
    return url;
  }
}

function extract(url: URL): Omit<ParsedGoogleMapsUrl, "canonicalUrl"> {
  const result: Omit<ParsedGoogleMapsUrl, "canonicalUrl"> = {};
  const placeId = url.searchParams.get("place_id")
    || url.searchParams.get("query_place_id")
    || url.searchParams.get("placeid");
  if (placeId) result.placeId = placeId;

  const cid = url.searchParams.get("cid") || url.searchParams.get("ludocid");
  if (cid && /^\d+$/.test(cid)) result.cid = cid;

  const query = url.searchParams.get("q");
  if (!result.placeId && query?.startsWith("place_id:")) result.placeId = query.slice(9);

  const coordinates = url.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+),/);
  if (coordinates) {
    result.lat = coordinates[1];
    result.lng = coordinates[2];
  }

  const data = url.searchParams.get("data") ?? url.href;
  const hexadecimalCid = data.match(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/i);
  if (!result.cid && hexadecimalCid) {
    try {
      result.cid = BigInt(`0x${hexadecimalCid[1]}`).toString(10);
    } catch {
      // Ignore a malformed Google identifier and keep the other parsed fields.
    }
  }

  const place = url.pathname.match(/\/maps\/place\/([^/@]+)/);
  if (place) {
    try {
      result.name = decodeURIComponent(place[1]).replace(/\+/g, " ");
    } catch {
      // Keep any other identity fields.
    }
  }
  return result;
}

export async function parseGoogleMapsUrl(
  raw: string,
): Promise<ParsedGoogleMapsUrl | GoogleMapsUrlParseError> {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Вставьте ссылку на заведение в Google Картах." };

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { error: "Это не похоже на ссылку Google Карт." };
  }
  if (!isGoogleHost(url.hostname)) return { error: "Ссылка ведёт не на Google Карты." };

  if (SHORT_LINK_HOSTS.has(url.hostname.toLowerCase())) {
    try {
      url = new URL(await resolveShortLink(url.href));
    } catch {
      return { error: "Не удалось открыть короткую ссылку. Вставьте полный адрес Google Карт." };
    }
  }
  if (!isGoogleHost(url.hostname)) return { error: "Короткая ссылка ведёт не на Google Карты." };

  const identity = extract(url);
  if (!identity.placeId && !identity.cid && !(identity.lat && identity.lng) && !identity.name) {
    return { error: "Не удалось распознать заведение. Скопируйте адрес открытой карточки в Google Картах." };
  }
  return { canonicalUrl: url.href, ...identity };
}
