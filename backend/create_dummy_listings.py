#!/usr/bin/env python3
"""
Create dummy listings with proper UID and all required fields
This will replace the existing listings with clean, consistent data
"""
import asyncio
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

# Sample property data with all fields from AdminNewListing form
DUMMY_LISTINGS = [
    {
        "id": str(uuid.uuid4()),  # Unique UID
        "title": "Modern 2BHK Apartment in Malviya Nagar",
        "property_type": "apartment",
        "status": "available",
        "price": 25000,
        "bedrooms": 2,
        "bathrooms": 2.0,
        "square_feet": 1200,
        "description": "Beautiful 2BHK apartment with modern amenities, perfect for families. Located in prime Malviya Nagar area with easy access to metro and shopping centers.",
        "features": ["parking", "gym", "swimming_pool", "security", "elevator", "power_backup"],
        "address": {
            "street": "123 Malviya Nagar Main Road",
            "city": "Jaipur",
            "state": "Rajasthan", 
            "zip_code": "302017",
            "country": "India",
            "full_address": "123 Malviya Nagar Main Road, Jaipur, Rajasthan 302017"
        },
        "coordinates": {
            "latitude": 26.8467,
            "longitude": 75.8048
        },
        "images": [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop"
        ],
        "nearby": "Metro Station, Shopping Mall, Schools, Hospitals",
        "location_text": "Prime location in Malviya Nagar with excellent connectivity",
        "contact_phone": "+91-9876543210",
        "alternative_phone": "+91-9876543211",
        "contact_email": "contact@malviyanagar.com",
        "agent_id": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Luxury 3BHK Villa in Vaishali Nagar", 
        "property_type": "house",
        "status": "available",
        "price": 45000,
        "bedrooms": 3,
        "bathrooms": 3.0,
        "square_feet": 2000,
        "description": "Spacious 3BHK independent villa with garden, perfect for large families. Premium location with all modern facilities and 24/7 security.",
        "features": ["parking", "garden", "security", "power_backup", "water_supply", "internet"],
        "address": {
            "street": "456 Vaishali Nagar Sector 5",
            "city": "Jaipur",
            "state": "Rajasthan",
            "zip_code": "302021", 
            "country": "India",
            "full_address": "456 Vaishali Nagar Sector 5, Jaipur, Rajasthan 302021"
        },
        "coordinates": {
            "latitude": 26.9157,
            "longitude": 75.7849
        },
        "images": [
            "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop", 
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop"
        ],
        "nearby": "Schools, Parks, Shopping Centers, Restaurants",
        "location_text": "Premium residential area with excellent infrastructure",
        "contact_phone": "+91-9876543220",
        "alternative_phone": "+91-9876543221",
        "contact_email": "contact@vaishali.com",
        "agent_id": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Cozy 1BHK Studio in C-Scheme",
        "property_type": "apartment", 
        "status": "available",
        "price": 18000,
        "bedrooms": 1,
        "bathrooms": 1.0,
        "square_feet": 600,
        "description": "Perfect 1BHK studio apartment for working professionals and students. Located in the heart of C-Scheme with easy access to offices and entertainment.",
        "features": ["parking", "elevator", "security", "internet", "furnished"],
        "address": {
            "street": "789 C-Scheme Central Plaza",
            "city": "Jaipur", 
            "state": "Rajasthan",
            "zip_code": "302001",
            "country": "India",
            "full_address": "789 C-Scheme Central Plaza, Jaipur, Rajasthan 302001"
        },
        "coordinates": {
            "latitude": 26.9124,
            "longitude": 75.7873
        },
        "images": [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&h=600&fit=crop"
        ],
        "nearby": "Metro Station, Offices, Restaurants, Shopping",
        "location_text": "Central location with excellent connectivity to business district",
        "contact_phone": "+91-9876543230",
        "alternative_phone": "+91-9876543231",
        "contact_email": "contact@cscheme.com",
        "agent_id": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Premium 4BHK Penthouse in Bani Park",
        "property_type": "condo",
        "status": "available", 
        "price": 75000,
        "bedrooms": 4,
        "bathrooms": 4.0,
        "square_feet": 3000,
        "description": "Luxurious 4BHK penthouse with terrace garden and city views. Premium amenities including gym, swimming pool, and concierge services.",
        "features": ["parking", "gym", "swimming_pool", "elevator", "security", "terrace", "city_view", "concierge"],
        "address": {
            "street": "101 Bani Park Heights Tower A",
            "city": "Jaipur",
            "state": "Rajasthan",
            "zip_code": "302016",
            "country": "India", 
            "full_address": "101 Bani Park Heights Tower A, Jaipur, Rajasthan 302016"
        },
        "coordinates": {
            "latitude": 26.9270,
            "longitude": 75.8235
        },
        "images": [
            "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop"
        ],
        "nearby": "Airport, Hotels, Business Centers, Fine Dining",
        "location_text": "Upscale area with premium lifestyle amenities",
        "contact_phone": "+91-9876543240",
        "alternative_phone": "+91-9876543241",
        "contact_email": "contact@banipark.com",
        "agent_id": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Student-Friendly 2BHK in Mansarovar",
        "property_type": "apartment",
        "status": "available",
        "price": 20000, 
        "bedrooms": 2,
        "bathrooms": 2.0,
        "square_feet": 900,
        "description": "Affordable 2BHK apartment perfect for students and young professionals. Close to universities and colleges with good public transport connectivity.",
        "features": ["parking", "internet", "security", "study_room", "common_area"],
        "address": {
            "street": "202 Mansarovar Sector 7",
            "city": "Jaipur",
            "state": "Rajasthan", 
            "zip_code": "302020",
            "country": "India",
            "full_address": "202 Mansarovar Sector 7, Jaipur, Rajasthan 302020"
        },
        "coordinates": {
            "latitude": 26.8512,
            "longitude": 75.7849
        },
        "images": [
            "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=600&fit=crop"
        ],
        "nearby": "Universities, Libraries, Cafes, Bus Stops",
        "location_text": "Student-friendly area with educational institutions nearby",
        "contact_phone": "+91-9876543250",
        "alternative_phone": "+91-9876543251",
        "contact_email": "contact@mansarovar.com",
        "agent_id": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
]

async def create_dummy_listings():
    """Create dummy listings in the database"""
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient('mongodb://mongodb:27017')
        db = client.ror_stay_database
        
        print("🗑️  Clearing existing properties...")
        # Clear existing properties
        await db.properties.delete_many({})
        
        print("📝 Creating new dummy listings...")
        # Insert new dummy listings
        result = await db.properties.insert_many(DUMMY_LISTINGS)
        
        print(f"✅ Successfully created {len(result.inserted_ids)} dummy listings!")
        
        # Display created listings
        print("\n📋 Created Listings:")
        async for doc in db.properties.find({}, {"id": 1, "title": 1, "price": 1}):
            print(f"  • ID: {doc['id'][:8]}... - {doc['title']} - ₹{doc['price']:,}")
        
        print(f"\n🎉 Database populated with {len(DUMMY_LISTINGS)} listings!")
        print("   Each listing has:")
        print("   ✅ Unique UID (id field)")
        print("   ✅ All fields from AdminNewListing form")
        print("   ✅ Sample images from Unsplash")
        print("   ✅ Realistic Jaipur addresses")
        print("   ✅ Proper coordinates")
        print("   ✅ Features and amenities")
        
    except Exception as e:
        print(f"❌ Error creating dummy listings: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_dummy_listings())
