import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

declare global {
  var mongooseConn:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const cached = global.mongooseConn ?? { conn: null, promise: null };

/** Bump when adding idempotent data migrations so they re-run without a full server restart. */
const CURRENT_DATA_MIGRATION_VERSION = 5;
let dataMigrationVersion = 0;

async function runDataMigrations() {
  if (dataMigrationVersion >= CURRENT_DATA_MIGRATION_VERSION) return;
  dataMigrationVersion = CURRENT_DATA_MIGRATION_VERSION;

  const { migrateCandidatesToLifecycle } = await import("@/lib/lifecycle-migrate");
  await migrateCandidatesToLifecycle();

  const { migrateLegacyLeadsToLeadCollection } = await import("@/lib/migrate-legacy-leads");
  await migrateLegacyLeadsToLeadCollection();

  const { backfillCandidateRegistrationTimestamps } = await import("@/lib/migrate-legacy-leads");
  await backfillCandidateRegistrationTimestamps();

  const { backfillRegistrationTokenExpiry } = await import("@/lib/migrate-registration-expiry");
  await backfillRegistrationTokenExpiry();

  const { migrateOnboardingToTwoForms } = await import("@/lib/migrate-onboarding-two-forms");
  await migrateOnboardingToTwoForms();

  const { migrateRemoveOnboardingStage } = await import("@/lib/migrate-remove-onboarding-stage");
  await migrateRemoveOnboardingStage();
}

type ConnectDbOptions = {
  /** When false, skips one-time data migrations (e.g. health checks). Default true. */
  runMigrations?: boolean;
};

export async function connectDb(options: ConnectDbOptions = {}) {
  const { runMigrations = true } = options;
  const uri = MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment.");
  }

  if (!cached.conn) {
    if (!cached.promise) {
      cached.promise = mongoose.connect(uri, {
        dbName: process.env.MONGODB_DB_NAME ?? "trainee_portal",
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
      });
    }
    cached.conn = await cached.promise;
    global.mongooseConn = cached;
  }

  if (runMigrations) {
    await runDataMigrations();
  }

  return cached.conn;
}

/** Lightweight ping — reuses the cached pool without running migrations. */
export async function pingDb(): Promise<boolean> {
  const uri = MONGODB_URI;
  if (!uri) return false;
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.admin().ping();
      return true;
    }
    await connectDb({ runMigrations: false });
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
}
