import { ObjectId } from "mongodb";
import { fail, HttpError, ok } from "@/lib/api/http";
import { getAdminCollection } from "@/lib/admin/collections";
import { CLASSROOM_SECTION } from "@/lib/constants/sections";
import { getDb } from "@/lib/db/mongodb";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function serialize(value: unknown): unknown {
  if (value instanceof ObjectId) return value.toHexString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}

function idFilter(id: string) {
  if (!ObjectId.isValid(id)) {
    throw new HttpError(400, "Invalid document id", "INVALID_ID");
  }
  return { _id: new ObjectId(id) };
}

function cleanDocument(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new HttpError(400, "Document body must be an object", "INVALID_DOCUMENT");
  }

  const document = { ...(input as Record<string, unknown>) };
  delete document._id;
  return document;
}

function buildSearch(searchFields: string[], query: string) {
  const keyword = query.trim();
  if (!keyword) return {};
  return { $or: searchFields.map((field) => ({ [field]: { $regex: keyword, $options: "i" } })) };
}

function buildExactFilters(searchParams: URLSearchParams) {
  const query: Record<string, unknown> = {};
  const allowed = ["year", "grade", "class", "classNum", "location", "place", "userId"];
  for (const field of allowed) {
    const value = searchParams.get(field);
    if (value) query[field] = value;
  }
  return query;
}

async function resolveCollection(rawKey: string) {
  const config = getAdminCollection(rawKey);
  if (!config) {
    throw new HttpError(404, "Admin collection not found", "ADMIN_COLLECTION_NOT_FOUND");
  }

  const db = await getDb();
  return { config, collection: db.collection(config.collection) };
}

function assertWritable(readOnly?: boolean) {
  if (readOnly) {
    throw new HttpError(405, "This admin collection is read-only", "READ_ONLY_COLLECTION");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function assertClassroomSectionLocked(collectionKey: string, document: Record<string, unknown>) {
  if (collectionKey !== "sections" || !("sections" in document)) return;
  if (!Array.isArray(document.sections)) {
    throw new HttpError(400, "Sections must be an array", "INVALID_SECTIONS");
  }

  const classroomSections = document.sections.filter(
    (section) => isRecord(section) && section.key === CLASSROOM_SECTION.key
  );
  if (classroomSections.length !== 1) {
    throw new HttpError(400, "교실은 기본 장소라 삭제하거나 중복 추가할 수 없습니다.", "CLASSROOM_SECTION_LOCKED");
  }

  const [classroom] = classroomSections;
  if (
    classroom.label !== CLASSROOM_SECTION.label ||
    classroom.isETC !== CLASSROOM_SECTION.isETC ||
    classroom.isAbsent !== CLASSROOM_SECTION.isAbsent
  ) {
    throw new HttpError(400, "교실은 기본 장소라 수정할 수 없습니다.", "CLASSROOM_SECTION_LOCKED");
  }
}

export async function GET(req: Request, context: { params: Promise<{ collection: string }> }) {
  try {
    const { collection: key } = await context.params;
    const { config, collection } = await resolveCollection(key);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));
    const query = {
      ...buildSearch(config.searchFields, searchParams.get("q") ?? ""),
      ...buildExactFilters(searchParams),
    };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      collection.find(query).sort(config.sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query),
    ]);

    return ok({
      collection: config.key,
      databaseCollection: config.collection,
      page,
      limit,
      total,
      items: serialize(items),
    });
  } catch (error) {
    return fail(error, "Failed to fetch admin collection");
  }
}

export async function POST(req: Request, context: { params: Promise<{ collection: string }> }) {
  try {
    const { collection: key } = await context.params;
    const { config, collection } = await resolveCollection(key);
    assertWritable(config.readOnly);
    const document = cleanDocument(await req.json());
    assertClassroomSectionLocked(config.key, document);
    const result = await collection.insertOne(document);
    const created = await collection.findOne(idFilter(result.insertedId.toHexString()));
    return ok({ insertedId: result.insertedId.toHexString(), document: serialize(created) }, { status: 201 });
  } catch (error) {
    return fail(error, "Failed to create admin document");
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ collection: string }> }) {
  try {
    const { collection: key } = await context.params;
    const { config, collection } = await resolveCollection(key);
    assertWritable(config.readOnly);
    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id : typeof body?._id === "string" ? body._id : "";
    if (!id) throw new HttpError(400, "Document id is required", "MISSING_ID");

    const document = cleanDocument(body.document ?? body);
    assertClassroomSectionLocked(config.key, document);
    const result = await collection.updateOne(idFilter(id), { $set: document });
    if (result.matchedCount === 0) throw new HttpError(404, "Document not found", "DOCUMENT_NOT_FOUND");
    const updated = await collection.findOne(idFilter(id));
    return ok({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, document: serialize(updated) });
  } catch (error) {
    return fail(error, "Failed to update admin document");
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ collection: string }> }) {
  try {
    const { collection: key } = await context.params;
    const { config, collection } = await resolveCollection(key);
    assertWritable(config.readOnly);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new HttpError(400, "Document id is required", "MISSING_ID");

    const result = await collection.deleteOne(idFilter(id));
    if (result.deletedCount === 0) throw new HttpError(404, "Document not found", "DOCUMENT_NOT_FOUND");
    return ok({ deletedCount: result.deletedCount });
  } catch (error) {
    return fail(error, "Failed to delete admin document");
  }
}
