import Foundation
import SQLite3

private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

final class LocationDbHelper {
  static let shared = LocationDbHelper()

  private let tableName = "local_location_events"
  private let transitionEventTypes = Set(["enter_geofence", "exit_geofence"])

  // ─── App Group identifier ──────────────────────────────────────────────────
  // Matches TrackingStateStore — must be added in Xcode → Signing & Capabilities.
  private static let appGroupSuite = "group.app.koord.tracking"

  private init() {}

  // ─── Database path ────────────────────────────────────────────────────────
  // Android stores the DB in the application's databases directory, which maps
  // to the App Group container on iOS.  Using the App Group path ensures:
  //   1. The native background process (after a process kill) can still open the DB.
  //   2. expo-sqlite (JS side) will open the same file when you pass the absolute
  //      path — both sides stay in sync.
  //
  // Fallback: If the App Group container isn't available (unsigned build / simulator
  // without entitlements) we fall back to the Documents/SQLite/ directory that the
  // old implementation used, so existing installs keep working.
  private func databaseURL() -> URL {
    let fileManager = FileManager.default

    // Primary: App Group shared container
    if let containerURL = fileManager.containerURL(forSecurityApplicationGroupIdentifier: LocationDbHelper.appGroupSuite) {
      let sqliteDir = containerURL.appendingPathComponent("SQLite", isDirectory: true)
      try? fileManager.createDirectory(at: sqliteDir, withIntermediateDirectories: true, attributes: nil)
      return sqliteDir.appendingPathComponent("workhourstracker.db")
    }

    // Fallback: Documents/SQLite (legacy path, kept for simulator / dev builds)
    NSLog("LocationDbHelper: App Group not available — using Documents/SQLite fallback path.")
    guard let documentsDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else {
      fatalError("LocationDbHelper: Cannot determine Documents directory")
    }
    let sqliteDir = documentsDirectory.appendingPathComponent("SQLite", isDirectory: true)
    try? fileManager.createDirectory(at: sqliteDir, withIntermediateDirectories: true, attributes: nil)
    return sqliteDir.appendingPathComponent("workhourstracker.db")
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  @discardableResult
  func insertLocationEvent(_ event: LocationEventRecord) -> Bool {
    guard let db = openDatabase() else { return false }
    defer { sqlite3_close(db) }

    guard prepareDatabase(db) else { return false }

    if shouldSkipTransitionInsert(db: db, assignmentId: event.assignmentId, type: event.type) {
      NSLog("LocationDbHelper: skipping duplicate transition \(event.type) for assignment \(event.assignmentId)")
      return false
    }

    let sql = """
      INSERT OR IGNORE INTO \(tableName)
      (id, timestamp, company_id, type, assignment_id, worker_id, latitude, longitude, notes, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
    """

    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { return false }
    defer { sqlite3_finalize(statement) }

    bind(text: event.id, to: 1, in: statement)
    bind(text: isoString(from: event.createdAt), to: 2, in: statement)
    bind(text: event.companyId, to: 3, in: statement)
    bind(text: event.type, to: 4, in: statement)
    bind(text: event.assignmentId, to: 5, in: statement)
    bind(text: event.workerId, to: 6, in: statement)
    sqlite3_bind_double(statement, 7, event.latitude)
    sqlite3_bind_double(statement, 8, event.longitude)
    bind(text: event.notes, to: 9, in: statement)

    return sqlite3_step(statement) == SQLITE_DONE && sqlite3_changes(db) > 0
  }

  func markSynced(id: String) {
    guard let db = openDatabase() else { return }
    defer { sqlite3_close(db) }
    guard prepareDatabase(db) else { return }

    let sql = "UPDATE \(tableName) SET synced = 1 WHERE id = ?;"
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { return }
    defer { sqlite3_finalize(statement) }
    bind(text: id, to: 1, in: statement)
    sqlite3_step(statement)
  }

  func unsyncedEvents(limit: Int = 25) -> [LocationEventRecord] {
    guard let db = openDatabase() else { return [] }
    defer { sqlite3_close(db) }
    guard prepareDatabase(db) else { return [] }

    let sql = """
      SELECT id, timestamp, company_id, type, assignment_id, worker_id, latitude, longitude, notes
      FROM \(tableName)
      WHERE synced = 0
      ORDER BY timestamp ASC
      LIMIT ?;
    """
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { return [] }
    defer { sqlite3_finalize(statement) }
    sqlite3_bind_int(statement, 1, Int32(limit))

    var events: [LocationEventRecord] = []
    while sqlite3_step(statement) == SQLITE_ROW {
      guard let idC = sqlite3_column_text(statement, 0),
            let timestampC = sqlite3_column_text(statement, 1),
            let companyIdC = sqlite3_column_text(statement, 2),
            let typeC = sqlite3_column_text(statement, 3),
            let assignmentIdC = sqlite3_column_text(statement, 4),
            let workerIdC = sqlite3_column_text(statement, 5) else {
        continue
      }

      let timestamp = String(cString: timestampC)
      guard let createdAt = date(from: timestamp) else { continue }

      let notes: String?
      if let notesC = sqlite3_column_text(statement, 8) {
        notes = String(cString: notesC)
      } else {
        notes = nil
      }

      events.append(LocationEventRecord(
        id: String(cString: idC),
        createdAt: createdAt,
        companyId: String(cString: companyIdC),
        workerId: String(cString: workerIdC),
        assignmentId: String(cString: assignmentIdC),
        type: String(cString: typeC),
        latitude: sqlite3_column_double(statement, 6),
        longitude: sqlite3_column_double(statement, 7),
        notes: notes
      ))
    }

    return events
  }

  /// Returns the total count of unsynced events — used by getDiagnostics().
  func unsyncedEventCount() -> Int {
    guard let db = openDatabase() else { return 0 }
    defer { sqlite3_close(db) }
    guard prepareDatabase(db) else { return 0 }

    let sql = "SELECT COUNT(*) FROM \(tableName) WHERE synced = 0;"
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { return 0 }
    defer { sqlite3_finalize(statement) }
    guard sqlite3_step(statement) == SQLITE_ROW else { return 0 }
    return Int(sqlite3_column_int(statement, 0))
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private func openDatabase() -> OpaquePointer? {
    let dbURL = databaseURL()
    var db: OpaquePointer?
    guard sqlite3_open(dbURL.path, &db) == SQLITE_OK else {
      if db != nil { sqlite3_close(db) }
      NSLog("LocationDbHelper: failed to open database at \(dbURL.path)")
      return nil
    }
    // WAL mode keeps the native write-ahead log in sync with the expo-sqlite JS connection.
    sqlite3_exec(db, "PRAGMA journal_mode=WAL;", nil, nil, nil)
    return db
  }

  private func prepareDatabase(_ db: OpaquePointer?) -> Bool {
    let createSQL = createTableSQL()
    guard sqlite3_exec(db, createSQL, nil, nil, nil) == SQLITE_OK else { return false }
    return ensureCompanyIdIsRequired(db)
  }

  private func ensureCompanyIdIsRequired(_ db: OpaquePointer?) -> Bool {
    let pragmaSQL = "PRAGMA table_info(\(tableName));"
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, pragmaSQL, -1, &statement, nil) == SQLITE_OK else { return false }
    defer { sqlite3_finalize(statement) }

    var hasCompanyId = false
    var companyIdNotNull = false

    while sqlite3_step(statement) == SQLITE_ROW {
      if let nameC = sqlite3_column_text(statement, 1) {
        let name = String(cString: nameC)
        if name == "company_id" {
          hasCompanyId = true
          companyIdNotNull = sqlite3_column_int(statement, 3) == 1
        }
      }
    }

    guard !hasCompanyId || !companyIdNotNull else { return true }

    if !hasCompanyId {
      let rebuildSQL = """
        BEGIN TRANSACTION;
        ALTER TABLE \(tableName) RENAME TO \(tableName)_legacy;
        \(createTableSQL())
        DROP TABLE \(tableName)_legacy;
        COMMIT;
      """
      return sqlite3_exec(db, rebuildSQL, nil, nil, nil) == SQLITE_OK
    }

    let rebuildSQL = """
      BEGIN TRANSACTION;
      ALTER TABLE \(tableName) RENAME TO \(tableName)_legacy;
      \(createTableSQL())
      INSERT INTO \(tableName) (id, timestamp, company_id, type, assignment_id, worker_id, latitude, longitude, notes, synced)
      SELECT id, timestamp, company_id, type, assignment_id, worker_id, latitude, longitude, notes, synced
      FROM \(tableName)_legacy
      WHERE company_id IS NOT NULL;
      DROP TABLE \(tableName)_legacy;
      COMMIT;
    """
    return sqlite3_exec(db, rebuildSQL, nil, nil, nil) == SQLITE_OK
  }

  private func createTableSQL() -> String {
    """
    CREATE TABLE IF NOT EXISTS \(tableName) (
      id TEXT PRIMARY KEY NOT NULL,
      timestamp TEXT NOT NULL,
      company_id TEXT NOT NULL,
      type TEXT NOT NULL,
      assignment_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      notes TEXT,
      synced INTEGER DEFAULT 0 NOT NULL
    );
    """
  }

  private func shouldSkipTransitionInsert(db: OpaquePointer?, assignmentId: String, type: String) -> Bool {
    guard transitionEventTypes.contains(type) else { return false }

    let sql = """
      SELECT type
      FROM \(tableName)
      WHERE assignment_id = ?
        AND type IN ('enter_geofence', 'exit_geofence')
      ORDER BY timestamp DESC
      LIMIT 1;
    """
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { return false }
    defer { sqlite3_finalize(statement) }
    bind(text: assignmentId, to: 1, in: statement)

    guard sqlite3_step(statement) == SQLITE_ROW,
          let typeC = sqlite3_column_text(statement, 0) else {
      return false
    }
    let lastType = String(cString: typeC)
    return lastType == type
  }

  private func bind(text: String?, to index: Int32, in statement: OpaquePointer?) {
    guard let text else {
      sqlite3_bind_null(statement, index)
      return
    }
    sqlite3_bind_text(statement, index, text, -1, SQLITE_TRANSIENT)
  }

  private func isoString(from date: Date) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    return formatter.string(from: date)
  }

  private func date(from isoString: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    return formatter.date(from: isoString)
  }
}
