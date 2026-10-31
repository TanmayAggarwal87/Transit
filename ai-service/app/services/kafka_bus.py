import json
import logging
from typing import Any, Dict, Optional
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
from app.config import settings

logger = logging.getLogger(__name__)


class KafkaBus:
    def __init__(self):
        self.producer: Optional[AIOKafkaProducer] = None
        self.is_connected: bool = False

    async def start(self) -> None:
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=settings.kafka_brokers,
                client_id=settings.kafka_client_id,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            )
            await self.producer.start()
            self.is_connected = True
            logger.info("AIOKafkaProducer connected successfully")
        except Exception as e:
            # shortcut: graceful fallback when Kafka is not running in dev, log event locally
            self.is_connected = False
            logger.warning(f"Kafka connection skipped/failed ({e}). Events will be logged.")

    async def stop(self) -> None:
        if self.producer and self.is_connected:
            try:
                await self.producer.stop()
            except Exception as e:
                logger.warning(f"Error stopping Kafka producer: {e}")
        self.is_connected = False

    async def publish(self, topic: str, message: Dict[str, Any]) -> bool:
        if self.producer and self.is_connected:
            try:
                await self.producer.send_and_wait(topic, message)
                logger.info(f"Published event to topic '{topic}': {message.get('type', 'event')}")
                return True
            except Exception as e:
                logger.warning(f"Failed to publish to Kafka ({topic}): {e}")

        logger.info(f"[Local Event Bus Fallback] Topic '{topic}': {json.dumps(message)}")
        return False


kafka_bus = KafkaBus()
