// MongoDB initialization script for ROR-STAY
// This script runs when the MongoDB container starts for the first time

// Switch to the application database
db = db.getSiblingDB('ror_stay_database');

// Create collections with indexes
db.createCollection('properties');
db.createCollection('contacts');
db.createCollection('users');

// Create indexes for better performance
db.properties.createIndex({ "status": 1 });
db.properties.createIndex({ "property_type": 1 });
db.properties.createIndex({ "price": 1 });
db.properties.createIndex({ "address.city": 1 });
db.properties.createIndex({ "created_at": -1 });

db.contacts.createIndex({ "created_at": -1 });
db.contacts.createIndex({ "email": 1 });

db.users.createIndex({ "email": 1 }, { unique: true });

print('Database initialized successfully');
