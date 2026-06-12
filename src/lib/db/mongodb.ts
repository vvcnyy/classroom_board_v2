import { MongoClient } from "mongodb";

declare global {
  var _classroomMongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }

  if (!global._classroomMongoClientPromise) {
    global._classroomMongoClientPromise = new MongoClient(uri).connect();
  }

  return global._classroomMongoClientPromise;
}

export async function getDb() {
  const dbName = process.env.MONGODB_DB;
  if (!dbName) {
    throw new Error("MONGODB_DB is not defined");
  }

  const client = await getClientPromise();
  return client.db(dbName);
}
