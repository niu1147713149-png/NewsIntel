from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Protocol
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import urlopen
from xml.etree import ElementTree


@dataclass(slots=True)
class FetchedNewsItem:
    title: str
    url: str
    published_at: datetime
    description: str | None
    content: str | None
    source_name: str


class NewsSkill(Protocol):
    source_key: str
    source_name: str

    async def fetch(self, limit: int) -> list[FetchedNewsItem]:
        ...


class RSSNewsSkill:
    source_key: str
    source_name: str
    rss_url: str

    async def fetch(self, limit: int) -> list[FetchedNewsItem]:
        rss_content = self._download_feed()
        root = ElementTree.fromstring(rss_content)
        items = root.findall(".//item")
        normalized_items: list[FetchedNewsItem] = []

        for node in items[:limit]:
            title = self._read_text(node, "title")
            link = self._read_text(node, "link")
            if not title or not link:
                continue

            published_raw = self._read_text(node, "pubDate")
            published_at = self._parse_published_at(published_raw)
            description = self._read_text(node, "description")
            normalized_items.append(
                FetchedNewsItem(
                    title=title,
                    url=link,
                    published_at=published_at,
                    description=description,
                    content=description,
                    source_name=self.source_name,
                )
            )

        return normalized_items

    def _download_feed(self) -> bytes:
        try:
            with urlopen(self.rss_url, timeout=10) as response:
                return response.read()
        except URLError as exc:
            raise RuntimeError(f"failed to fetch RSS feed: {self.source_key}") from exc

    @staticmethod
    def _read_text(node: ElementTree.Element, tag: str) -> str | None:
        child = node.find(tag)
        if child is None or child.text is None:
            return None
        text = child.text.strip()
        return text if text else None

    @staticmethod
    def _parse_published_at(raw_value: str | None) -> datetime:
        if not raw_value:
            return datetime.now(timezone.utc)

        parsed = parsedate_to_datetime(raw_value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)


class ReutersWorldNewsSkill(RSSNewsSkill):
    source_key = "reuters_world"
    source_name = "Reuters"
    rss_url = "https://feeds.reuters.com/Reuters/worldNews"


class BBCWorldNewsSkill(RSSNewsSkill):
    source_key = "bbc_world"
    source_name = "BBC"
    rss_url = "https://feeds.bbci.co.uk/news/world/rss.xml"


def get_available_skills() -> dict[str, NewsSkill]:
    skills: list[NewsSkill] = [ReutersWorldNewsSkill(), BBCWorldNewsSkill()]
    return {skill.source_key: skill for skill in skills}


def normalize_source_url(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return ""
    return f"{parsed.scheme}://{parsed.netloc}"
