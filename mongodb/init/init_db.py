#!/usr/bin/env python3
"""
Initialize MongoDB collections and indexes for ROR STAY.
Optionally seed sample properties for development.

Usage:
  python backend/scripts/init_db.py            # create indexes
  python backend/scripts/init_db.py --seed     # create indexes + seed sample data

This script reads settings from backend/config.py (ENVIRONMENT variables supported).
"""
import argparse
import asyncio
from datetime import datetime
from typing import List

from config import get_settings, get_database


async def ensure_indexes():
    db = get_database()

    # Properties collection indexes
    await db.properties.create_index("id", unique=True)
    await db.properties.create_index("status")
    await db.properties.create_index("property_type")
    await db.properties.create_index("price")
    await db.properties.create_index("address.city")
    await db.properties.create_index("bedrooms")
    await db.properties.create_index("bathrooms")
    await db.properties.create_index("square_feet")
    await db.properties.create_index([("coordinates.latitude", 1), ("coordinates.longitude", 1)])

    # Contact submissions indexes (help admin page filters)
    await db.contact_submissions.create_index("id", unique=True)
    await db.contact_submissions.create_index("status")
    await db.contact_submissions.create_index("email")
    await db.contact_submissions.create_index("preferred_location")
    await db.contact_submissions.create_index("created_at")

    # Inquiries indexes
    await db.inquiries.create_index("id", unique=True)
    await db.inquiries.create_index("status")
    await db.inquiries.create_index("user_id")
    await db.inquiries.create_index("property_id")
    await db.inquiries.create_index("created_at")

    print("[init-db] Indexes ensured.")


def sample_properties() -> List[dict]:
    now = datetime.utcnow()
    return [
        {
            "id": "seed-apt-1",
            "title": "Modern 2BHK Apartment",
            "property_type": "apartment",
            "status": "available",
            "price": 12000,
            "bedrooms": 2,
            "bathrooms": 1,
            "square_feet": 900,
            "description": "Bright 2BHK near tech park",
            "features": ["balcony", "parking", "gym"],
            "images": [],
            "address": {
                "street": "123 Main St",
                "city": "Mumbai",
                "state": "MH",
                "zip_code": "400001",
                "country": "India",
                "full_address": "123 Main St, Mumbai, MH 400001",
            },
            "coordinates": {"latitude": 19.1334, "longitude": 72.9133},
            "agent_id": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": "seed-house-1",
            "title": "Spacious 3BHK House",
            "property_type": "house",
            "status": "available",
            "price": 22000,
            "bedrooms": 3,
            "bathrooms": 2,
            "square_feet": 1600,
            "description": "Family home in quiet neighborhood",
            "features": ["garden", "parking"],
            "images": [],
            "address": {
                "street": "45 Green Ave",
                "city": "Pune",
                "state": "MH",
                "zip_code": "411001",
                "country": "India",
                "full_address": "45 Green Ave, Pune, MH 411001",
            },
            "coordinates": {"latitude": 18.5204, "longitude": 73.8567},
            "agent_id": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": "seed-studio-1",
            "title": "Cozy Studio Near College",
            "property_type": "apartment",
            "status": "available",
            "price": 7000,
            "bedrooms": 1,
            "bathrooms": 1,
            "square_feet": 450,
            "description": "Perfect for students, walk-to-campus",
            "features": ["furnished"],
            "images": [],
            "address": {
                "street": "9 Campus Rd",
                "city": "Jaipur",
                "state": "RJ",
                "zip_code": "302001",
                "country": "India",
                "full_address": "9 Campus Rd, Jaipur, RJ 302001",
            },
            "coordinates": {"latitude": 26.9124, "longitude": 75.7873},
            "agent_id": None,
            "created_at": now,
            "updated_at": now,
        },
    ]


async def seed_data():
    db = get_database()
    props = sample_properties()
    inserted = 0
    for p in props:
        existing = await db.properties.find_one({"id": p["id"]})
        if not existing:
            await db.properties.insert_one(p)
            inserted += 1
    print(f"[init-db] Seeded properties: {inserted} new, {len(props) - inserted} skipped (already exist).")


async def main():
    parser = argparse.ArgumentParser(description="Initialize MongoDB for ROR STAY")
    parser.add_argument("--seed", action="store_true", help="Insert sample properties")
    args = parser.parse_args()

    settings = get_settings()
    print(f"[init-db] Connecting to {settings.mongo_url}/{settings.db_name}")

    await ensure_indexes()
    if args.seed:
        await seed_data()


if __name__ == "__main__":
    asyncio.run(main())
