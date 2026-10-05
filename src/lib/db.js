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
    systemPrompt: "You are the helpful AI Admission Counselor for Apex Institute of Technology & Sciences. Use the college information provided below to answer user queries."
  },
  collegeInfo: {
    name: "Apex Institute of Technology & Sciences",
    tagline: "Fostering Innovation, Integrity, and Excellence since 2010",
    description: "Apex Institute is a premier institution offering state-of-the-art engineering, management, and technology education.",
    location: "Silicon Valley, CA (Metro Campus)",
    email: "admissions@apex-institute.edu",
    phone: "+1 (555) 019-2834",
    courses: [
      { id: "c1", name: "B.Tech Computer Science & Engineering", duration: "4 Years", fees: "₹1,50,000 / year", eligibility: "High school graduate with Physics, Chemistry, and Math. Min 75% aggregate." }
    ],
    facilities: [
      { name: "Robotics & AI Center", description: "State-of-the-art laboratory powered by industry-grade equipment." }
    ],
    admissionProcess: [
      "Step 1: Submit online enquiry.",
      "Step 2: Fill Application Form."
    ],
    dates: [
      { event: "Applications Open", date: "August 1, 2026" }
    ]
  },
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
