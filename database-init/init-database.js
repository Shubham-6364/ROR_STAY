// ROR STAY - Database Initialization Script
// This script initializes the MongoDB database with sample data

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Database configuration
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ror_stay';

async function initializeDatabase() {
    console.log('🚀 Starting ROR STAY database initialization...');
    
    const client = new MongoClient(MONGO_URL);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db(DB_NAME);
        
        // Clear existing collections
        console.log('🧹 Clearing existing data...');
        await db.collection('properties').deleteMany({});
        await db.collection('contact_submissions').deleteMany({});
        await db.collection('users').deleteMany({});
        
        // Load and insert properties data
        console.log('🏠 Inserting properties data...');
        const propertiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'properties-export.json'), 'utf8'));
        if (propertiesData && propertiesData.length > 0) {
            await db.collection('properties').insertMany(propertiesData);
            console.log(`✅ Inserted ${propertiesData.length} properties`);
        }
        
        // Load and insert contact submissions
        console.log('📧 Inserting contact submissions...');
        const contactsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'contacts-export.json'), 'utf8'));
        if (contactsData && contactsData.length > 0) {
            await db.collection('contact_submissions').insertMany(contactsData);
            console.log(`✅ Inserted ${contactsData.length} contact submissions`);
        }
        
        // Create admin user
        console.log('👤 Creating admin user...');
        const bcrypt = require('bcrypt');
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        await db.collection('users').insertOne({
            id: 'admin-user-001',
            email: 'admin@rorstay.com',
            password: adminPassword,
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        });
        console.log('✅ Admin user created (admin@rorstay.com / admin123)');
        
        // Create indexes for better performance
        console.log('📊 Creating database indexes...');
        await db.collection('properties').createIndex({ id: 1 }, { unique: true });
        await db.collection('properties').createIndex({ status: 1 });
        await db.collection('properties').createIndex({ property_type: 1 });
        await db.collection('properties').createIndex({ price: 1 });
        await db.collection('properties').createIndex({ "address.city": 1 });
        
        await db.collection('contact_submissions').createIndex({ id: 1 }, { unique: true });
        await db.collection('contact_submissions').createIndex({ status: 1 });
        await db.collection('contact_submissions').createIndex({ created_at: -1 });
        
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ id: 1 }, { unique: true });
        
        console.log('✅ Database indexes created');
        
        console.log('🎉 Database initialization completed successfully!');
        console.log('📊 Summary:');
        console.log(`   - Properties: ${propertiesData?.length || 0}`);
        console.log(`   - Contact Submissions: ${contactsData?.length || 0}`);
        console.log(`   - Admin User: admin@rorstay.com`);
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('🔌 Database connection closed');
    }
}

// Run initialization
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };
