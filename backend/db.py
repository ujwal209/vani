import logging
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

logger = logging.getLogger("vani.db")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI} (Database: {settings.DB_NAME})...")
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URI)
    db_instance.db = db_instance.client[settings.DB_NAME]
    
    # Create indexes on users collection for email search
    try:
        await db_instance.db.users.create_index("email", unique=True)
        logger.info("MongoDB connected and user email index created.")
    except Exception as e:
        logger.warning(f"Connected to MongoDB with warning on index creation: {e}")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    return db_instance.db
