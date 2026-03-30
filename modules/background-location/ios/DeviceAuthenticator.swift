import Foundation
import Security
import CryptoKit

final class DeviceAuthenticator {
  private enum Keys {
    static let service = "app.koord.backgroundlocation"
    static let token = "device_token"
    static let secret = "device_secret"
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
    SecItemAdd(insertQuery as CFDictionary, nil)
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
