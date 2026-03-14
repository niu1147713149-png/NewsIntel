from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import Stock
from app.models.user import User, Watchlist
from app.schemas.watchlist import WatchlistItemData
from app.services.stock_service import StockService


class WatchlistService:
    def __init__(self, db_session: AsyncSession) -> None:
        self._db = db_session
        self._stock_service = StockService(db_session=db_session)

    async def list_items(self, user: User) -> list[WatchlistItemData]:
        statement = (
            select(Watchlist)
            .where(Watchlist.user_id == user.id)
            .options(selectinload(Watchlist.user), selectinload(Watchlist.user))
            .order_by(Watchlist.created_at.desc())
        )
        rows = list((await self._db.scalars(statement)).all())
        if not rows:
            return []

        stock_ids = [row.stock_id for row in rows]
        stocks = list(
            (
                await self._db.scalars(
                    select(Stock)
                    .where(Stock.id.in_(stock_ids), Stock.is_deleted.is_(False))
                    .options(selectinload(Stock.prices))
                )
            ).all()
        )
        stocks_by_id = {stock.id: stock for stock in stocks}

        items: list[WatchlistItemData] = []
        for row in rows:
            stock = stocks_by_id.get(row.stock_id)
            if stock is None:
                continue
            stock_list_item = self._stock_service._build_stock_list_item(stock)
            items.append(
                WatchlistItemData(
                    stock_id=stock.id,
                    ticker=stock.ticker,
                    name=stock.name,
                    exchange=stock.exchange,
                    sector=stock.sector,
                    industry=stock.industry,
                    country=stock.country,
                    market_cap=float(stock.market_cap) if stock.market_cap is not None else None,
                    snapshot=stock_list_item.snapshot,
                    added_at=row.created_at,
                )
            )
        return items

    async def add_item(self, user: User, stock_id: int) -> list[WatchlistItemData]:
        stock = await self._db.scalar(select(Stock).where(Stock.id == stock_id, Stock.is_deleted.is_(False)))
        if stock is None:
            raise ValueError("stock_not_found")

        existing_row = await self._db.scalar(
            select(Watchlist).where(Watchlist.user_id == user.id, Watchlist.stock_id == stock_id)
        )
        if existing_row is None:
            self._db.add(Watchlist(user_id=user.id, stock_id=stock_id))
            await self._db.commit()

        return await self.list_items(user=user)

    async def remove_item(self, user: User, stock_id: int) -> list[WatchlistItemData]:
        await self._db.execute(delete(Watchlist).where(Watchlist.user_id == user.id, Watchlist.stock_id == stock_id))
        await self._db.commit()
        return await self.list_items(user=user)
