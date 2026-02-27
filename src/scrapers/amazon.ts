import * as cheerio from 'cheerio';
import { fetchPage } from './fetcher';

export interface AmazonProduct {
  asin: string;
  title: string;
  price: number | null;
  currency: string;
  rating: number | null;
  reviewCount: number | null;
  bsr: number | null;
  seller: string | null;
  imageUrl: string | null;
  images: string[];
  availability: string | null;
  features: string[];
  categories: string[];
}

export async function scrapeAmazonProduct(asin: string, domain = 'www.amazon.com'): Promise<AmazonProduct> {
  const url = `https://${domain}/dp/${asin}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  // Title
  const title = $('#productTitle').text().trim() || $('h1#title span').text().trim();

  // Price
  let priceText = $('.a-price .a-offscreen').first().text().trim()
    || $('#priceblock_ourprice').text().trim()
    || $('#priceblock_dealprice').text().trim()
    || $('span.a-price-whole').first().text().trim();
  const priceMatch = priceText.match(/[\d,.]+/);
  const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;

  // Currency
  const currencyMatch = priceText.match(/^([^\d\s]+)/);
  const currency = currencyMatch ? currencyMatch[1] : 'USD';

  // Rating
  const ratingText = $('span[data-hook="rating-out-of-text"]').text()
    || $('#acrPopover .a-icon-alt').text()
    || $('i.a-icon-star span.a-icon-alt').first().text();
  const ratingMatch = ratingText.match(/([\d.]+)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

  // Review count
  const reviewText = $('#acrCustomerReviewText').text() || $('span[data-hook="total-review-count"]').text();
  const reviewMatch = reviewText.match(/([\d,]+)/);
  const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : null;

  // BSR
  let bsr: number | null = null;
  const bsrEl = $('#productDetails_detailBullets_sections1 tr, #detailBulletsWrapper_feature_div li').filter(function () {
    return $(this).text().includes('Best Sellers Rank');
  });
  if (bsrEl.length) {
    const bsrMatch = bsrEl.text().match(/#([\d,]+)/);
    bsr = bsrMatch ? parseInt(bsrMatch[1].replace(/,/g, '')) : null;
  }

  // Seller
  const seller = $('#sellerProfileTriggerId').text().trim()
    || $('#merchant-info a').first().text().trim()
    || null;

  // Images
  const imageUrl = $('#landingImage').attr('src')
    || $('#imgBlkFront').attr('src')
    || null;

  const images: string[] = [];
  $('script').each(function () {
    const scriptText = $(this).html() || '';
    const imgMatches = scriptText.match(/"hiRes":"(https:\/\/[^"]+)"/g);
    if (imgMatches) {
      imgMatches.forEach(m => {
        const urlMatch = m.match(/"hiRes":"([^"]+)"/);
        if (urlMatch) images.push(urlMatch[1]);
      });
    }
  });
  if (images.length === 0 && imageUrl) images.push(imageUrl);

  // Availability
  const availability = $('#availability span').first().text().trim() || null;

  // Features
  const features: string[] = [];
  $('#feature-bullets ul li span.a-list-item').each(function () {
    const text = $(this).text().trim();
    if (text && !text.includes('›')) features.push(text);
  });

  // Categories
  const categories: string[] = [];
  $('#wayfinding-breadcrumbs_feature_div ul li a').each(function () {
    categories.push($(this).text().trim());
  });

  return {
    asin,
    title,
    price,
    currency,
    rating,
    reviewCount,
    bsr,
    seller,
    imageUrl,
    images,
    availability,
    features,
    categories,
  };
}

export interface AmazonSearchResult {
  asin: string;
  title: string;
  price: number | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string | null;
  sponsored: boolean;
}

export async function searchAmazon(keyword: string, page = 1, domain = 'www.amazon.com'): Promise<AmazonSearchResult[]> {
  const url = `https://${domain}/s?k=${encodeURIComponent(keyword)}&page=${page}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const results: AmazonSearchResult[] = [];

  $('div[data-component-type="s-search-result"]').each(function () {
    const el = $(this);
    const asin = el.attr('data-asin') || '';
    if (!asin) return;

    const title = el.find('h2 a span').text().trim();
    const priceWhole = el.find('.a-price-whole').first().text().replace(/[,\.]/g, '');
    const priceFraction = el.find('.a-price-fraction').first().text();
    const price = priceWhole ? parseFloat(`${priceWhole}.${priceFraction || '00'}`) : null;

    const ratingText = el.find('.a-icon-star-small .a-icon-alt').text();
    const ratingMatch = ratingText.match(/([\d.]+)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

    const reviewText = el.find('.a-size-base.s-underline-text').text();
    const reviewMatch = reviewText.match(/([\d,]+)/);
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : null;

    const imageUrl = el.find('.s-image').attr('src') || null;
    const sponsored = el.find('.a-color-secondary:contains("Sponsored")').length > 0;

    results.push({ asin, title, price, rating, reviewCount, imageUrl, sponsored });
  });

  return results.slice(0, 20);
}
