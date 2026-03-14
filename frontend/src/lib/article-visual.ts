import type { Article } from "@/types/news";

const PALETTES = [
  { bg: "#E8F1FF", accent: "#2F6BFF", accentSoft: "#A8C5FF", ink: "#0F172A" },
  { bg: "#FFF1E6", accent: "#F97316", accentSoft: "#FDBA74", ink: "#1F2937" },
  { bg: "#EEFDF7", accent: "#059669", accentSoft: "#86EFAC", ink: "#0F172A" },
  { bg: "#F5F3FF", accent: "#7C3AED", accentSoft: "#C4B5FD", ink: "#1F2937" },
  { bg: "#F0FDFA", accent: "#0F766E", accentSoft: "#99F6E4", ink: "#0F172A" }
] as const;

function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getArticleLabel(article: Pick<Article, "categories" | "source_name">): string {
  return article.categories?.[0]?.name ?? article.source_name ?? "Global Brief";
}

export function getArticleVisualDataUri(article: Pick<Article, "id" | "title" | "source_name" | "categories">): string {
  const seed = hashSeed(`${article.id}-${article.title}-${article.source_name ?? "source"}`);
  const palette = PALETTES[seed % PALETTES.length];
  const categoryLabel = getArticleLabel(article).slice(0, 20).toUpperCase();
  const titleLine = article.title.replace(/[<&>]/g, "").slice(0, 54);
  const dotX = 40 + (seed % 180);
  const dotY = 24 + (seed % 90);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" fill="none">
      <rect width="1200" height="720" rx="40" fill="${palette.bg}"/>
      <rect x="52" y="52" width="1096" height="616" rx="28" fill="white" fill-opacity="0.45"/>
      <path d="M1040 0C955 92 926 181 949 266C980 384 1110 405 1200 523V720H834C857 626 891 559 940 519C1017 455 1126 453 1122 335C1120 270 1077 190 1040 0Z" fill="${palette.accentSoft}" fill-opacity="0.55"/>
      <circle cx="${dotX}" cy="${dotY}" r="180" fill="${palette.accent}" fill-opacity="0.14"/>
      <circle cx="1018" cy="126" r="126" fill="${palette.accent}" fill-opacity="0.12"/>
      <rect x="88" y="92" width="188" height="42" rx="21" fill="${palette.accent}" fill-opacity="0.14"/>
      <text x="112" y="119" fill="${palette.accent}" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="2">${categoryLabel}</text>
      <text x="88" y="244" fill="${palette.ink}" font-family="Georgia, Times New Roman, serif" font-size="70" font-weight="700">NewsIntel</text>
      <text x="88" y="310" fill="${palette.ink}" fill-opacity="0.72" font-family="Segoe UI, Arial, sans-serif" font-size="30">${titleLine}</text>
      <rect x="88" y="390" width="380" height="14" rx="7" fill="${palette.accent}" fill-opacity="0.16"/>
      <rect x="88" y="424" width="326" height="14" rx="7" fill="${palette.accent}" fill-opacity="0.12"/>
      <rect x="88" y="458" width="284" height="14" rx="7" fill="${palette.accent}" fill-opacity="0.12"/>
      <rect x="88" y="560" width="188" height="56" rx="28" fill="${palette.ink}"/>
      <text x="126" y="596" fill="white" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700">Signal View</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getArticleVisualAlt(article: Pick<Article, "title">): string {
  return `${article.title} 的新闻封面插图`;
}
