import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.database import init_db, engine, AsyncSessionLocal
from app.services.kafka_bus import kafka_bus
from app.services.demand_service import demand_service
from app.services.pricing_engine import pricing_engine
from app.ml.demand_model import demand_engine
from app.api.routes import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")


async def periodic_tasks():
    # shortcut: simple asyncio task loop, upgrade to Celery/APScheduler under distributed load
    iteration = 0
    while True:
        try:
            await asyncio.sleep(120)  # run check every 2 mins
            iteration += 1

            async with AsyncSessionLocal() as session:
                # 14.3: Every 2 minutes recompute pricing for active zones
                await pricing_engine.recompute_active_zones(session)

                # 14.2: Every 5 minutes (approx every 2-3 iterations) run demand predictions
                if iteration % 2 == 0:
                    await demand_service.run_predictions_for_active_zones(session)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Error in background task iteration: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Transit AI Service...")
    await init_db()
    await kafka_bus.start()

    # Bootstrap baseline model if not already trained
    if demand_engine.model is None:
        try:
            demand_engine.train([])
            logger.info("Baseline demand model trained successfully")
        except Exception as e:
            logger.warning(f"Initial model training skipped: {e}")

    # Launch periodic background task
    bg_task = asyncio.create_task(periodic_tasks())

    yield

    # Shutdown
    bg_task.cancel()
    await kafka_bus.stop()
    await pricing_engine.redis_client.aclose()
    await demand_service.redis_client.aclose()
    await engine.dispose()
    logger.info("Transit AI Service shutdown complete.")


app = FastAPI(
    title="Transit AI Service",
    version="1.0.0",
    description="Intelligent Demand Prediction, Pricing & EV Routing Service",
    lifespan=lifespan,
)

app.include_router(router)
