import logging
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

logger = logging.getLogger("vani.db")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    if not settings.MONGODB_URI:
        logger.warning("MONGODB_URI is not configured.")
        return
    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI[:25]}... (Database: {settings.DB_NAME})")
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
        db_instance.db = db_instance.client[settings.DB_NAME]
        
        # Create indexes on users collection for email search
        await db_instance.db.users.create_index("email", unique=True)
        logger.info("MongoDB connected and user email index created.")
    except Exception as e:
        logger.warning(f"MongoDB connection initialized with warning/timeout: {e}")

async def close_mongo_connection():
    if db_instance.client:
        try:
            db_instance.client.close()
            logger.info("MongoDB connection closed.")
        except Exception:
            pass

def get_database():
    if db_instance.db is None and settings.MONGODB_URI:
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
        db_instance.db = db_instance.client[settings.DB_NAME]
    return db_instance.db
