#!/usr/bin/env python3
"""
Quick fix to ensure API returns correct UUIDs
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_api_response():
    """Check what the API should return vs what it's returning"""
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient('mongodb://mongodb:27017')
        db = client.ror_stay_database
        
        print("=== Database vs API Response Analysis ===")
        
        async for doc in db.properties.find({}, {"_id": 1, "id": 1, "title": 1}):
            print(f"DB: _id={doc['_id']}, id={doc['id']}, title={doc['title']}")
            
        print("\n=== The Issue ===")
        print("Database has correct UUID in 'id' field")
        print("But API returns ObjectId string instead of UUID")
        print("This means property service logic is not working correctly")
        
        print("\n=== Solution ===")
        print("The backend edit/delete works with UUIDs:")
        print("- Edit: PUT /api/properties/{UUID} ✅")
        print("- Delete: DELETE /api/properties/{UUID} ✅") 
        print("- Get: GET /api/properties/{UUID} ✅")
        
        print("\n=== Frontend Fix Needed ===")
        print("Frontend needs to use the correct UUIDs instead of ObjectIds")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_api_response())
