import { MongoClient, ObjectId } from "mongodb";
import type { Db } from "mongodb";
import type { ConnectionConfig, MongoCollectionInfo, MongoDocument, MongoFindResult, CrudResult } from "../../shared/types/database";
import type { MongoDBDriver } from "../types";

export class MongoDBDriverImpl implements MongoDBDriver {
  private client: MongoClient | null = null;

  async connect(config: ConnectionConfig, password?: string): Promise<void> {
    const auth =
      config.username && password
        ? `${encodeURIComponent(config.username)}:${encodeURIComponent(password)}@`
        : config.username
          ? `${encodeURIComponent(config.username)}@`
          : "";

    const uri = `mongodb://${auth}${config.host}:${config.port}`;

    this.client = new MongoClient(uri, {
      connectTimeoutMS: config.connectionTimeout,
      serverSelectionTimeoutMS: config.connectionTimeout,
      tls: config.ssl,
      tlsAllowInvalidCertificates: config.ssl ? !config.sslRejectUnauthorized : undefined,
    });

    await this.client.connect();
    // Verify connectivity
    await this.client.db("admin").command({ ping: 1 });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  async ping(): Promise<void> {
    if (!this.client) throw new Error("Not connected");
    await this.client.db("admin").command({ ping: 1 });
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  private getClient(): MongoClient {
    if (!this.client) throw new Error("Not connected");
    return this.client;
  }

  private getDb(database: string): Db {
    return this.getClient().db(database);
  }

  async listDatabases(): Promise<string[]> {
    const client = this.getClient();
    const result = await client.db("admin").admin().listDatabases();
    return result.databases.map((db) => db.name);
  }

  async listCollections(database: string): Promise<MongoCollectionInfo[]> {
    const db = this.getDb(database);
    const collections = await db.listCollections().toArray();

    const results: MongoCollectionInfo[] = [];
    for (const col of collections) {
      let count = 0;
      try {
        count = await db.collection(col.name).estimatedDocumentCount();
      } catch {
        // estimatedDocumentCount may fail on views
      }
      results.push({
        name: col.name,
        type: col.type === "view" ? "view" : "collection",
        count,
      });
    }

    return results;
  }

  async findDocuments(
    database: string,
    collection: string,
    filter: Record<string, unknown>,
    page: number,
    pageSize: number,
    sort?: Record<string, 1 | -1>,
  ): Promise<MongoFindResult> {
    const db = this.getDb(database);
    const col = db.collection(collection);

    const totalCount = await col.countDocuments(filter);
    const cursor = col.find(filter).skip(page * pageSize).limit(pageSize);
    if (sort) {
      cursor.sort(sort);
    }

    const rawDocs = await cursor.toArray();
    const documents: MongoDocument[] = rawDocs.map((doc) => ({
      ...doc,
      _id: String(doc._id),
    }));

    return {
      documents,
      totalCount,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < totalCount,
    };
  }

  async insertDocument(
    database: string,
    collection: string,
    document: Record<string, unknown>,
  ): Promise<CrudResult> {
    const db = this.getDb(database);
    const result = await db.collection(collection).insertOne(document);
    return {
      success: result.acknowledged,
      affectedRows: result.acknowledged ? 1 : 0,
    };
  }

  async updateDocument(
    database: string,
    collection: string,
    documentId: string,
    update: Record<string, unknown>,
  ): Promise<CrudResult> {
    const db = this.getDb(database);
    // Remove _id from update payload to prevent immutable field error
    const { _id, ...updateFields } = update;
    const result = await db.collection(collection).updateOne(
      { _id: new ObjectId(documentId) },
      { $set: updateFields },
    );
    return {
      success: result.acknowledged,
      affectedRows: result.modifiedCount,
    };
  }

  async deleteDocuments(
    database: string,
    collection: string,
    documentIds: string[],
  ): Promise<CrudResult> {
    const db = this.getDb(database);
    const objectIds = documentIds.map((id) => new ObjectId(id));
    const result = await db.collection(collection).deleteMany({
      _id: { $in: objectIds },
    });
    return {
      success: result.acknowledged,
      affectedRows: result.deletedCount,
    };
  }

  async aggregate(
    database: string,
    collection: string,
    pipeline: Record<string, unknown>[],
  ): Promise<MongoDocument[]> {
    const db = this.getDb(database);
    const rawDocs = await db.collection(collection).aggregate(pipeline).toArray();
    return rawDocs.map((doc) => ({
      ...doc,
      _id: String(doc._id),
    }));
  }
}
