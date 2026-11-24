import Foundation
import Security
import CryptoKit

final class DeviceAuthenticator {
  private enum Keys {
    static let service = "app.koord.backgroundlocation"
    static let token = "device_token"
    static let secret = "device_secret"
  }

  /// Readable after the first unlock following a reboot, including while the phone is locked.
  /// The default (`WhenUnlocked`) made the credentials unreadable whenever the phone was locked,
  /// which is exactly when background geofence events upload. `ThisDeviceOnly` keeps the
  /// device secret out of backups, so it never moves to another phone.
  private static let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

  init() {
    migrateAccessibility()
  }

  var deviceToken: String? {
    readValue(for: Keys.token)
  }

  private var deviceSecret: String? {
    readValue(for: Keys.secret)
  }

  func storeCredentials(token: String, secret: String) {
    storeValue(token, for: Keys.token)
    storeValue(secret, for: Keys.secret)
  }

  func clearCredentials() {
    deleteValue(for: Keys.token)
    deleteValue(for: Keys.secret)
  }

  func computeHmac(_ data: String) -> String {
    guard let secret = deviceSecret?.data(using: .utf8),
          let payload = data.data(using: .utf8) else {
      return ""
    }
    let key = SymmetricKey(data: secret)
    let signature = HMAC<SHA256>.authenticationCode(for: payload, using: key)
    return Data(signature).map { String(format: "%02x", $0) }.joined()
  }

  private func storeValue(_ value: String, for account: String) {
    guard let data = value.data(using: .utf8) else { return }
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: Keys.service,
      kSecAttrAccount as String: account
    ]
    SecItemDelete(query as CFDictionary)
    var insertQuery = query
    insertQuery[kSecValueData as String] = data
    insertQuery[kSecAttrAccessible as String] = DeviceAuthenticator.accessibility
    let status = SecItemAdd(insertQuery as CFDictionary, nil)
    if status != errSecSuccess {
      NSLog("DeviceAuthenticator: failed to store \(account) (OSStatus \(status))")
    }
  }

  /// Items written by earlier builds use the default accessibility (`WhenUnlocked`).
  /// Move them to the new class. This only succeeds while the device is unlocked
  /// (errSecInteractionNotAllowed otherwise), so it is retried on every init and is a
  /// no-op once migrated or when nothing is stored.
  private func migrateAccessibility() {
    for account in [Keys.token, Keys.secret] {
      let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: Keys.service,
        kSecAttrAccount as String: account
      ]
      let update: [String: Any] = [
        kSecAttrAccessible as String: DeviceAuthenticator.accessibility
      ]
      let status = SecItemUpdate(query as CFDictionary, update as CFDictionary)
      if status != errSecSuccess && status != errSecItemNotFound && status != errSecInteractionNotAllowed {
        NSLog("DeviceAuthenticator: accessibility migration for \(account) failed (OSStatus \(status))")
      }
    }
  }

  private func readValue(for account: String) -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: Keys.service,
      kSecAttrAccount as String: account,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    guard status == errSecSuccess,
          let data = result as? Data else {
      return nil
    }
    return String(data: data, encoding: .utf8)
  }

  private func deleteValue(for account: String) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: Keys.service,
      kSecAttrAccount as String: account
    ]
    SecItemDelete(query as CFDictionary)
  }
}
