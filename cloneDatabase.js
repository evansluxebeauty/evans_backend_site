import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Source DB is current database
const SOURCE_URI = process.env.MONGODB_URI || 'mongodb+srv://evans_db:8903777150@evans.5jl3pv2.mongodb.net/evans?appName=evans';

// Target DB can be passed as argument or env variable TARGET_MONGODB_URI
const TARGET_URI = process.env.TARGET_MONGODB_URI || process.argv[2];

if (!TARGET_URI) {
  console.error('Error: Target MongoDB URI is required.');
  console.log('Usage: node cloneDatabase.js "<TARGET_MONGODB_URI>"');
  process.exit(1);
}

const cloneDatabase = async () => {
  try {
    console.log('Connecting to Source Database...');
    const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
    console.log('Source Database Connected.');

    console.log('Connecting to Target Database...');
    const targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
    console.log('Target Database Connected.');

    // Get all collection names from source
    const collections = await sourceConn.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections to clone:`, collections.map(c => c.name));

    for (const col of collections) {
      const colName = col.name;
      if (colName.startsWith('system.')) continue;

      console.log(`\nCloning collection: ${colName} ...`);
      const sourceDocs = await sourceConn.db.collection(colName).find({}).toArray();
      console.log(`Found ${sourceDocs.length} documents in source "${colName}".`);

      if (sourceDocs.length > 0) {
        // Clear target collection first
        await targetConn.db.collection(colName).deleteMany({});
        // Insert source documents into target
        await targetConn.db.collection(colName).insertMany(sourceDocs);
        console.log(`Successfully copied ${sourceDocs.length} documents to target "${colName}".`);
      } else {
        console.log(`Collection "${colName}" is empty, skipped.`);
      }
    }

    console.log('\n✅ Database cloning completed successfully!');
    await sourceConn.close();
    await targetConn.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Cloning Failed:', error.message);
    process.exit(1);
  }
};

cloneDatabase();
