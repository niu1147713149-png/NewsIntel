from __future__ import annotations

import argparse
import asyncio
import hashlib
import logging
from dataclasses import dataclass
from typing import Final

from sqlalchemy import select

from app.core.bootstrap import CATEGORY_SEEDS, initialize_database
from app.core.database import get_async_session_factory
from app.ingestion import FetchedNewsItem, get_available_skills, normalize_source_url
from app.ingestion.news_skills import NewsSkill
from app.models.article import Article, ArticleCategory, Category
from app.schemas.news import ArticleOut
from app.services.news_stream_bus import get_news_stream_bus

LOGGER: Final[logging.Logger] = logging.getLogger("news_ingest_script")

CATEGORY_KEYWORDS: Final[dict[str, tuple[str, ...]]] = {
    "geopolitics": ("war", "sanction", "conflict", "nato", "china", "russia", "middle east"),
    "elections": ("election", "vote", "poll", "candidate", "campaign", "parliament"),
    "economy": ("inflation", "gdp", "economy", "rate", "market", "trade", "recession"),
    "crime": ("crime", "fraud", "arrest", "investigation", "court", "lawsuit"),
    "bilateral_agreements": ("agreement", "deal", "bilateral", "partnership", "mou", "treaty"),
    "policy": ("policy", "regulation", "bill", "law", "government", "central bank"),
}


@dataclass(slots=True)
class IngestionStats:
    fetched: int = 0
    inserted: int = 0
    skipped_duplicate: int = 0
    skipped_invalid: int = 0
    failed: int = 0


def merge_stats(target: IngestionStats, incoming: IngestionStats) -> None:
    target.fetched += incoming.fetched
    target.inserted += incoming.inserted
    target.skipped_duplicate += incoming.skipped_duplicate
    target.skipped_invalid += incoming.skipped_invalid
    target.failed += incoming.failed


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest latest news by source into NewsIntel database.")
    parser.add_argument(
        "--source",
        required=True,
        help="Source skill key (e.g. reuters_world, bbc_world) or 'all' for every source.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Default fetch limit per source. Default: 20.",
    )
    parser.add_argument(
        "--per-source-limit",
        type=int,
        default=None,
        help="Override per-source fetch limit. If unset, fallback to --limit.",
    )
    parser.add_argument(
        "--global-limit",
        type=int,
        default=None,
        help="Maximum total inserted articles across all sources. Only effective when --source all.",
    )
    return parser.parse_args()


def map_to_category_slug(item: FetchedNewsItem) -> tuple[str, float]:
    text = f"{item.title} {item.description or ''}".lower()
    best_slug = "policy"
    best_score = 0

    for slug, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in text)
        if score > best_score:
            best_slug = slug
            best_score = score

    confidence = 0.5 if best_score == 0 else min(0.9, 0.55 + best_score * 0.08)
    return best_slug, confidence


def build_url_hash(url: str) -> str:
    return hashlib.md5(url.encode("utf-8"), usedforsecurity=False).hexdigest()


async def load_categories() -> dict[str, Category]:
    session_factory = get_async_session_factory()
    async with session_factory() as session:
        known_slugs = [slug for _, slug in CATEGORY_SEEDS]
        rows = await session.scalars(select(Category).where(Category.slug.in_(known_slugs)))
        category_map = {row.slug: row for row in rows}
        return category_map


async def run_ingestion_for_source(
    source: str,
    limit: int,
    skill: NewsSkill,
    category_map: dict[str, Category],
    seen_hashes: set[str],
    insert_limit: int | None = None,
) -> IngestionStats:
    stats = IngestionStats()
    inserted_articles: list[ArticleOut] = []

    try:
        fetched_items = await skill.fetch(limit=limit)
    except RuntimeError as exc:
        LOGGER.exception("fetch failed for source=%s", source, exc_info=exc)
        return stats

    stats.fetched = len(fetched_items)
    if not fetched_items:
        return stats

    session_factory = get_async_session_factory()

    async with session_factory() as session:
        hashes = [build_url_hash(item.url) for item in fetched_items if item.url]
        existing_hashes = set(
            await session.scalars(select(Article.url_hash).where(Article.url_hash.in_(hashes)))
        )

        for item in fetched_items:
            try:
                if insert_limit is not None and stats.inserted >= insert_limit:
                    break

                if not item.title or not item.url:
                    stats.skipped_invalid += 1
                    continue

                url_hash = build_url_hash(item.url)
                if url_hash in existing_hashes or url_hash in seen_hashes:
                    stats.skipped_duplicate += 1
                    continue

                category_slug, confidence = map_to_category_slug(item)
                category = category_map.get(category_slug)
                if category is None:
                    stats.skipped_invalid += 1
                    continue

                article = Article(
                    title=item.title.strip(),
                    description=item.description,
                    content=item.content,
                    url=item.url.strip(),
                    url_hash=url_hash,
                    source_name=item.source_name,
                    source_url=normalize_source_url(item.url),
                    published_at=item.published_at,
                    language="en",
                    country=None,
                    is_processed=True,
                )
                session.add(article)
                await session.flush()

                session.add(
                    ArticleCategory(
                        article_id=article.id,
                        category_id=category.id,
                        confidence=confidence,
                    )
                )
                inserted_articles.append(
                    ArticleOut(
                        id=article.id,
                        title=article.title,
                        description=article.description,
                        url=article.url,
                        source_name=article.source_name,
                        published_at=article.published_at,
                        language=article.language,
                    )
                )
                seen_hashes.add(url_hash)
                stats.inserted += 1
            except (RuntimeError, ValueError) as exc:
                LOGGER.warning("skip item due to processing error: %s", exc)
                stats.failed += 1

        await session.commit()

    if inserted_articles:
        get_news_stream_bus().publish_articles(inserted_articles)

    return stats


async def run_ingestion(
    source: str,
    limit: int,
    per_source_limit: int | None = None,
    global_limit: int | None = None,
) -> IngestionStats:
    skills = get_available_skills()
    if source == "all":
        selected_sources = sorted(skills.items(), key=lambda item: item[0])
    else:
        skill = skills.get(source)
        if skill is None:
            raise ValueError(f"unsupported source: {source}. available={','.join(sorted(skills.keys()))},all")
        selected_sources = [(source, skill)]

    category_map = await load_categories()
    merged_stats = IngestionStats()
    seen_hashes: set[str] = set()
    source_limit = per_source_limit if per_source_limit is not None else limit
    effective_global_limit = global_limit if source == "all" else None

    for source_key, source_skill in selected_sources:
        remaining_insert_limit: int | None = None
        if effective_global_limit is not None:
            remaining_insert_limit = max(effective_global_limit - merged_stats.inserted, 0)
            if remaining_insert_limit == 0:
                break

        source_stats = await run_ingestion_for_source(
            source=source_key,
            limit=source_limit,
            skill=source_skill,
            category_map=category_map,
            seen_hashes=seen_hashes,
            insert_limit=remaining_insert_limit,
        )
        merge_stats(merged_stats, source_stats)

    return merged_stats


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    args = parse_arguments()
    await initialize_database()
    per_source_limit = max(args.per_source_limit, 1) if args.per_source_limit is not None else max(args.limit, 1)
    global_limit = max(args.global_limit, 1) if args.global_limit is not None else None
    stats = await run_ingestion(
        source=args.source,
        limit=max(args.limit, 1),
        per_source_limit=per_source_limit,
        global_limit=global_limit,
    )
    LOGGER.info(
        "ingestion finished source=%s fetched=%d inserted=%d duplicate=%d invalid=%d failed=%d",
        args.source,
        stats.fetched,
        stats.inserted,
        stats.skipped_duplicate,
        stats.skipped_invalid,
        stats.failed,
    )


if __name__ == "__main__":
    asyncio.run(main())
