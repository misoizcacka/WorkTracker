import Foundation

/// Simple file-based logger that mirrors Android's LocationFileLogger.
/// Writes logs to a rotating file in the app's Documents directory so workers
/// can export and share them via the diagnostics screen.
class LocationFileLogger {
  static let shared = LocationFileLogger()
  
  private let maxFileSizeBytes = 2_000_000  // 2MB max
  private let maxBackupFiles = 1
  private let logFileName = "location_tracking.log"
  private var logFileURL: URL
  
  private let queue = DispatchQueue(label: "LocationFileLogger", qos: .utility)
  
  private init() {
    let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    logFileURL = documentsPath.appendingPathComponent(logFileName)
    
    // Create file if it doesn't exist
    if !FileManager.default.fileExists(atPath: logFileURL.path) {
      FileManager.default.createFile(atPath: logFileURL.path, contents: nil)
    }
  }
  
  // MARK: - Public API
  
  func log(level: String, tag: String, message: String) {
    queue.async { [weak self] in
      self?.writeLog(level: level, tag: tag, message: message)
    }
  }
  
  func info(_ tag: String, _ message: String) {
    log(level: "I", tag: tag, message: message)
  }
  
  func warning(_ tag: String, _ message: String) {
    log(level: "W", tag: tag, message: message)
  }
  
  func error(_ tag: String, _ message: String) {
    log(level: "E", tag: tag, message: message)
  }
  
  func debug(_ tag: String, _ message: String) {
    log(level: "D", tag: tag, message: message)
  }
  
  func getRecentLogs(maxLines: Int) -> String {
    var result = ""
    queue.sync {
      guard let content = try? String(contentsOf: logFileURL, encoding: .utf8) else {
        return
      }
      let lines = content.split(separator: "\n", omittingEmptySubsequences: false)
      let recentLines = lines.suffix(maxLines)
      result = recentLines.joined(separator: "\n")
    }
    return result
  }
  
  func exportAllLogs() -> String {
    var result = ""
    queue.sync {
      result = (try? String(contentsOf: logFileURL, encoding: .utf8)) ?? "No logs available"
    }
    return result
  }
  
  func getLogStats() -> [String: Any] {
    var stats: [String: Any] = [:]
    queue.sync {
      guard let content = try? String(contentsOf: logFileURL, encoding: .utf8) else {
        stats = ["error": "Could not read log file"]
        return
      }
      
      let lines = content.split(separator: "\n", omittingEmptySubsequences: false)
      let fileSize = (try? FileManager.default.attributesOfItem(atPath: logFileURL.path)[.size] as? Int) ?? 0
      
      stats = [
        "totalLines": lines.count,
        "fileSizeBytes": fileSize,
        "fileSizeKB": fileSize / 1024,
        "maxSizeKB": maxFileSizeBytes / 1024,
        "logFilePath": logFileURL.path
      ]
    }
    return stats
  }
  
  func clearLogs() {
    queue.async { [weak self] in
      guard let self = self else { return }
      try? FileManager.default.removeItem(at: self.logFileURL)
      FileManager.default.createFile(atPath: self.logFileURL.path, contents: nil)
      self.info("LocationFileLogger", "Logs cleared")
    }
  }
  
  // MARK: - Private
  
  private func writeLog(level: String, tag: String, message: String) {
    let timestamp = ISO8601DateFormatter().string(from: Date())
    let logLine = "[\(timestamp)] \(level)/\(tag): \(message)\n"
    
    // Also log to console for Xcode debugging
    NSLog("[\(level)/\(tag)] \(message)")
    
    guard let data = logLine.data(using: .utf8) else { return }
    
    if let fileHandle = try? FileHandle(forWritingTo: logFileURL) {
      fileHandle.seekToEndOfFile()
      fileHandle.write(data)
      try? fileHandle.close()
      
      // Check if rotation is needed
      rotateIfNeeded()
    }
  }
  
  private func rotateIfNeeded() {
    guard let attrs = try? FileManager.default.attributesOfItem(atPath: logFileURL.path),
          let fileSize = attrs[.size] as? Int,
          fileSize > maxFileSizeBytes else {
      return
    }
    
    // Simple rotation: backup current file and create new one
    let backupURL = logFileURL.deletingPathExtension().appendingPathExtension("log.1")
    try? FileManager.default.removeItem(at: backupURL)
    try? FileManager.default.moveItem(at: logFileURL, to: backupURL)
    FileManager.default.createFile(atPath: logFileURL.path, contents: nil)
    
    info("LocationFileLogger", "Log file rotated (exceeded \(maxFileSizeBytes / 1024)KB)")
  }
}
