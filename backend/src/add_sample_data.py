#!/usr/bin/env python3
"""
Script to add sample property data to the ROR-STAY database
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# Database configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ror_stay_database")

sample_properties = [
    {
        "title": "Modern 2BHK Apartment in Downtown",
        "description": "Beautiful modern apartment with city views, fully furnished with all amenities. Perfect for professionals and small families.",
        "property_type": "apartment",
        "status": "available",
        "price": 1200,
        "address": {
            "street": "123 Main Street",
            "city": "New York",
            "state": "NY",
            "zip_code": "10001",
            "country": "USA"
        },
        "coordinates": {
            "latitude": 40.7589,
            "longitude": -73.9851
        },
        "bedrooms": 2,
        "bathrooms": 2,
        "square_feet": 1100,
        "features": [
            "furnished",
            "parking",
            "gym",
            "nearby:subway",
            "nearby:shopping"
        ],
        "images": [
            "https://picsum.photos/800/600?random=1",
            "https://picsum.photos/800/600?random=2"
        ],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "title": "Cozy 1BHK Studio Near University",
        "description": "Perfect for students! Cozy studio apartment near the university campus with all basic amenities.",
        "property_type": "apartment",
        "status": "available",
        "price": 800,
        "address": {
            "street": "456 College Ave",
            "city": "Boston",
            "state": "MA",
            "zip_code": "02115",
            "country": "USA"
        },
        "coordinates": {
            "latitude": 42.3398,
            "longitude": -71.0892
        },
        "bedrooms": 1,
        "bathrooms": 1,
        "square_feet": 650,
        "features": [
            "furnished",
            "wifi",
            "nearby:university",
            "nearby:library"
        ],
        "images": [
            "https://picsum.photos/800/600?random=3",
            "https://picsum.photos/800/600?random=4"
        ],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "title": "Luxury 3BHK Condo with Pool",
        "description": "Spacious luxury condominium with swimming pool, gym, and 24/7 security. Great for families.",
        "property_type": "condo",
        "status": "available",
        "price": 2500,
        "address": {
            "street": "789 Luxury Lane",
            "city": "Miami",
            "state": "FL",
            "zip_code": "33101",
            "country": "USA"
        },
        "coordinates": {
            "latitude": 25.7617,
            "longitude": -80.1918
        },
        "bedrooms": 3,
        "bathrooms": 3,
        "square_feet": 1800,
        "features": [
            "furnished",
            "parking",
            "pool",
            "gym",
            "security",
            "nearby:beach",
            "nearby:shopping"
        ],
        "images": [
            "https://picsum.photos/800/600?random=5",
            "https://picsum.photos/800/600?random=6",
            "https://picsum.photos/800/600?random=7"
        ],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "title": "Budget-Friendly 1BHK Flat",
        "description": "Affordable flat perfect for young professionals. Basic amenities included.",
        "property_type": "apartment",
        "status": "available",
        "price": 600,
        "address": {
            "street": "321 Budget Street",
            "city": "Austin",
            "state": "TX",
            "zip_code": "73301",
            "country": "USA"
        },
        "coordinates": {
            "latitude": 30.2672,
            "longitude": -97.7431
        },
        "bedrooms": 1,
        "bathrooms": 1,
        "square_feet": 500,
        "features": [
            "parking",
            "nearby:bus_stop",
            "nearby:grocery"
        ],
        "images": [
            "https://picsum.photos/800/600?random=8"
        ],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
]

async def add_sample_data():
    """Add sample properties to the database"""
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        properties_collection = db.properties
        
        # Check if properties already exist
        existing_count = await properties_collection.count_documents({})
        print(f"Current properties in database: {existing_count}")
        
        if existing_count > 0:
            print("Properties already exist in database. Using existing properties.")
            print("Listing current properties:")
            
            # List existing properties
            properties = await properties_collection.find({}).to_list(length=None)
            for i, prop in enumerate(properties, 1):
                title = prop.get('title', 'No title')
                price = prop.get('price', 'No price')
                address = prop.get('address', {})
                city = address.get('city', 'No city')
                state = address.get('state', 'No state')
                print(f"  {i}. {title} - ${price}/month ({city}, {state})")
            
            print(f"\nTotal: {len(properties)} properties available")
            return
        
        # Only insert sample properties if database is empty
        result = await properties_collection.insert_many(sample_properties)
        print(f"Successfully inserted {len(result.inserted_ids)} sample properties!")
        
        # Print inserted property titles
        for i, prop in enumerate(sample_properties):
            print(f"  {i+1}. {prop['title']} - ${prop['price']}/month")
        
        client.close()
        
    except Exception as e:
        print(f"Error adding sample data: {e}")

if __name__ == "__main__":
    asyncio.run(add_sample_data())
