#!/usr/bin/env python3
"""
Script to check existing properties in the database
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Database configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ror_stay_database")

async def check_existing_properties():
    """Check what properties currently exist in the database"""
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        properties_collection = db.properties
        
        count = await properties_collection.count_documents({})
        print(f"Total properties in database: {count}")
        
        if count > 0:
            properties = await properties_collection.find({}).to_list(length=None)
            print("\nExisting properties:")
            for i, prop in enumerate(properties, 1):
                print(f"{i}. {prop.get('title', 'No title')} - ${prop.get('price', 'No price')}/month")
                print(f"   Status: {prop.get('status', 'No status')}")
                address = prop.get('address', {})
                print(f"   Location: {address.get('city', 'No city')}, {address.get('state', 'No state')}")
                print(f"   Bedrooms: {prop.get('bedrooms', 'N/A')}, Bathrooms: {prop.get('bathrooms', 'N/A')}")
                print(f"   Square feet: {prop.get('square_feet', 'N/A')}")
                print()
        else:
            print("No properties found in database.")
        
        client.close()
        
    except Exception as e:
        print(f"Error checking properties: {e}")

if __name__ == "__main__":
    asyncio.run(check_existing_properties())
