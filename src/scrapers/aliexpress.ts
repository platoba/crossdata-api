import * as cheerio from 'cheerio';
import { fetchPage } from './fetcher';

export interface AliExpressProduct {
  productId: string;
  title: string;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  rating: number | null;
  orders: number | null;
  seller: string | null;
  storeId: string | null;
  imageUrl: string | null;
  images: string[];
  attributes: Array<{ title: string; options: string[] }>;
  properties: Array<{ key: string; value: string }>;
}

export async function scrapeAliExpressProduct(productId: string): Promise<AliExpressProduct> {
  const url = `https://www.aliexpress.com/item/${productId}.html`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  // Try to extract data from embedded JSON (modern AliExpress uses SSR data)
  let data: any = {};

  // Method 1: Look for window.__INIT_DATA__ or runParams
  const scripts = $('script').toArray();
  for (const script of scripts) {
    const text = $(script).html() || '';

    // Modern AliExpress embeds data in window.runParams
    const runParamsMatch = text.match(/window\.runParams\s*=\s*({[\s\S]*?});/);
    if (runParamsMatch) {
      try { data = JSON.parse(runParamsMatch[1]); } catch {}
    }

    // Or data in __INIT_DATA__
    const initDataMatch = text.match(/window\.__INIT_DATA__\s*=\s*({[\s\S]*?});?\s*<\/script>/);
    if (initDataMatch) {
      try { data = JSON.parse(initDataMatch[1]); } catch {}
    }
  }

  // Title
  const title = data?.pageModule?.title
    || $('h1[data-pl="product-title"]').text().trim()
    || $('h1.product-title-text').text().trim()
    || $('meta[property="og:title"]').attr('content')
    || '';

  // Price
  let price: number | null = null;
  let originalPrice: number | null = null;
  const currency = data?.priceModule?.formatedActivityPrice?.match(/^([^\d]+)/)?.[1]?.trim() || 'USD';

  if (data?.priceModule) {
    const pm = data.priceModule;
    const actPrice = pm.formatedActivityPrice || pm.formatedPrice || '';
    const priceMatch = actPrice.match(/[\d,.]+/);
    price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;

    const origPrice = pm.formatedPrice || '';
    const origMatch = origPrice.match(/[\d,.]+/);
    originalPrice = origMatch ? parseFloat(origMatch[0].replace(/,/g, '')) : null;
  } else {
    const priceText = $('span.product-price-value').first().text();
    const priceMatch = priceText.match(/[\d,.]+/);
    price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;
  }

  // Rating
  const ratingText = data?.titleModule?.feedbackRating?.averageStar
    || $('span.overview-rating-average').text();
  const rating = ratingText ? parseFloat(String(ratingText)) : null;

  // Orders
  const ordersText = data?.titleModule?.tradeCount
    || $('span.product-reviewer-sold').text();
  const ordersMatch = String(ordersText || '').match(/[\d,]+/);
  const orders = ordersMatch ? parseInt(ordersMatch[0].replace(/,/g, '')) : null;

  // Store
  const seller = data?.storeModule?.storeName
    || $('span.shop-name a').text().trim()
    || null;
  const storeId = data?.storeModule?.storeNum
    ? String(data.storeModule.storeNum)
    : null;

  // Images
  const images: string[] = [];
  if (data?.imageModule?.imagePathList) {
    data.imageModule.imagePathList.forEach((img: string) => {
      images.push(img.startsWith('//') ? `https:${img}` : img);
    });
  } else {
    $('.image-thumb-list img, .images-view-item img').each(function () {
      const src = $(this).attr('src');
      if (src) images.push(src.startsWith('//') ? `https:${src}` : src);
    });
  }
  const imageUrl = images[0] || $('meta[property="og:image"]').attr('content') || null;

  // Attributes / SKU
  const attributes: Array<{ title: string; options: string[] }> = [];
  if (data?.skuModule?.productSKUPropertyList) {
    for (const prop of data.skuModule.productSKUPropertyList) {
      attributes.push({
        title: prop.skuPropertyName,
        options: prop.skuPropertyValues.map((v: any) => v.propertyValueDisplayName),
      });
    }
  }

  // Properties / specs
  const properties: Array<{ key: string; value: string }> = [];
  if (data?.specsModule?.props) {
    for (const p of data.specsModule.props) {
      properties.push({ key: p.attrName, value: p.attrValue });
    }
  } else {
    $('ul.product-property-list li').each(function () {
      const key = $(this).find('.propery-title').text().replace(':', '').trim();
      const value = $(this).find('.propery-des').text().trim();
      if (key) properties.push({ key, value });
    });
  }

  return {
    productId,
    title,
    price,
    originalPrice,
    currency,
    rating,
    orders,
    seller,
    storeId,
    imageUrl,
    images,
    attributes,
    properties,
  };
}

export interface AliExpressSearchResult {
  productId: string;
  title: string;
  price: number | null;
  rating: number | null;
  orders: number | null;
  imageUrl: string | null;
}

export async function searchAliExpress(keyword: string): Promise<AliExpressSearchResult[]> {
  const url = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(keyword)}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const results: AliExpressSearchResult[] = [];

  // Try JSON data first
  const scripts = $('script').toArray();
  for (const script of scripts) {
    const text = $(script).html() || '';
    const match = text.match(/window\.__INIT_DATA__\s*=\s*({[\s\S]*?});?\s*$/m);
    if (match) {
      try {
        const initData = JSON.parse(match[1]);
        const items = initData?.data?.root?.fields?.mods?.itemList?.content || [];
        for (const item of items.slice(0, 20)) {
          results.push({
            productId: item.productId || item.itemId || '',
            title: item.title?.displayTitle || item.title || '',
            price: item.prices?.salePrice?.minPrice ? parseFloat(item.prices.salePrice.minPrice) : null,
            rating: item.evaluation?.starRating ? parseFloat(item.evaluation.starRating) : null,
            orders: item.trade?.tradeDesc ? parseInt(String(item.trade.tradeDesc).replace(/\D/g, '')) || null : null,
            imageUrl: item.image?.imgUrl ? `https:${item.image.imgUrl}` : null,
          });
        }
      } catch {}
    }
  }

  // Fallback: parse HTML cards
  if (results.length === 0) {
    $('a[href*="/item/"]').each(function () {
      const el = $(this);
      const href = el.attr('href') || '';
      const pidMatch = href.match(/\/item\/(\d+)\.html/);
      if (!pidMatch) return;

      const title = el.find('h3, h1, .item-title').text().trim() || el.attr('title') || '';
      const priceText = el.find('.price, .item-price').text();
      const priceMatch = priceText.match(/[\d,.]+/);

      results.push({
        productId: pidMatch[1],
        title,
        price: priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null,
        rating: null,
        orders: null,
        imageUrl: el.find('img').attr('src') || null,
      });
    });
  }

  return results.slice(0, 20);
}
