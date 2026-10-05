import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'college_chatbot';

let client;
let clientPromise;

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
}

const dbPath = path.join(process.cwd(), 'src', 'lib', 'db.json');

const defaultData = {
  settings: {
    mode: "ai",
    apiKey: "",
    provider: "openrouter",
    model: "openai/gpt-3.5-turbo",
    systemPrompt: "You are the helpful AI Admission Counselor..."
  },
  collegeInfo: {},
  keywords: [],
  leads: []
};

// Helper for MongoDB operations
export async function getMongoDb() {
  if (!uri) return null;
  const client = await clientPromise;
  return client.db(dbName);
}

export async function readDB() {
  if (uri) {
    try {
      const db = await getMongoDb();
      const collection = db.collection('data');
      const data = await collection.findOne({ _id: 'main_data' });
      
      if (data) {
        delete data._id;
        return data;
      } else {
        // Initialize default data in MongoDB if empty
        await collection.insertOne({ _id: 'main_data', ...defaultData });
        return defaultData;
      }
    } catch (error) {
      console.error("MongoDB read error, falling back to local file:", error);
    }
  }

  // Fallback to db.json file
  try {
    if (!fs.existsSync(dbPath)) return defaultData;
    const fileContent = await fs.promises.readFile(dbPath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading db.json:", error);
    return defaultData;
  }
}

export async function writeDB(data) {
  if (uri) {
    try {
      const db = await getMongoDb();
      const collection = db.collection('data');
      await collection.replaceOne({ _id: 'main_data' }, { _id: 'main_data', ...data }, { upsert: true });
      return true;
    } catch (error) {
      console.error("MongoDB write error:", error);
      return false;
    }
  }

  // Fallback to db.json file
  try {
    const tempPath = `${dbPath}.tmp`;
    await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.promises.rename(tempPath, dbPath);
    return true;
  } catch (error) {
    console.error("Error writing db.json:", error);
    return false;
  }
}
