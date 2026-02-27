import { searchAmazon } from '../scrapers/amazon';
import { searchAliExpress } from '../scrapers/aliexpress';
import { redis } from '../db/redis';

export async function searchKeyword(keyword: string, platform = 'amazon') {
  // Check cache (5 min TTL)
  const cacheKey = `search:${platform}:${keyword.toLowerCase().trim()}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return { cached: true, platform, keyword, results: JSON.parse(cached) };
  }

  let results: any[];
  if (platform === 'amazon') {
    results = await searchAmazon(keyword);
  } else if (platform === 'aliexpress') {
    results = await searchAliExpress(keyword);
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // Cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(results), 'EX', 300);

  return { cached: false, platform, keyword, results };
}

export async function suggestKeywords(seed: string, platform = 'amazon') {
  // Generate keyword suggestions based on common patterns
  const suffixes = [
    '', ' for men', ' for women', ' for kids',
    ' best', ' cheap', ' premium', ' 2025',
    ' review', ' alternative', ' vs',
    ' accessories', ' set', ' kit',
    ' wholesale', ' bulk', ' custom',
    ' small', ' large', ' mini', ' portable',
  ];

  const prefixes = [
    'best ', 'cheap ', 'top ', 'new ',
    'how to use ', 'where to buy ',
  ];

  const suggestions: string[] = [];

  // Suffix-based suggestions
  for (const suffix of suffixes) {
    const kw = `${seed}${suffix}`.trim();
    if (kw !== seed) suggestions.push(kw);
  }

  // Prefix-based suggestions
  for (const prefix of prefixes) {
    suggestions.push(`${prefix}${seed}`);
  }

  // Try to get autocomplete from Amazon if platform is amazon
  if (platform === 'amazon') {
    try {
      const fetchFn = (await import('node-fetch')).default;
      const url = `https://completion.amazon.com/api/2017/suggestions?mid=ATVPDKIKX0DER&alias=aps&prefix=${encodeURIComponent(seed)}`;
      const resp = await fetchFn(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        const data = await resp.json() as any;
        if (data.suggestions) {
          const autoSuggestions = data.suggestions.map((s: any) => s.value).filter(Boolean);
          return {
            seed,
            platform,
            suggestions: [...new Set([...autoSuggestions, ...suggestions])].slice(0, 30),
            source: 'autocomplete+generated',
          };
        }
      }
    } catch {}
  }

  return {
    seed,
    platform,
    suggestions: suggestions.slice(0, 30),
    source: 'generated',
  };
}
