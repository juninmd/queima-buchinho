import UserNotifications

/// Baixa a imagem do payload (`fcm_options.image`) e a anexa à notificação antes de exibi-la.
/// Sem esta extensão o iOS mostra só título e texto. Passo a passo em docs/pwa/NATIVE.md.
class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var best: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        best = request.content.mutableCopy() as? UNMutableNotificationContent
        guard let content = best,
              let raw = request.content.userInfo["fcm_options"] as? [String: Any],
              let link = raw["image"] as? String, let url = URL(string: link), url.scheme == "https" else {
            return contentHandler(request.content)
        }
        URLSession.shared.downloadTask(with: url) { file, _, _ in
            defer { contentHandler(content) }
            guard let file = file else { return }
            let target = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(url.lastPathComponent)
            try? FileManager.default.removeItem(at: target)
            guard (try? FileManager.default.moveItem(at: file, to: target)) != nil,
                  let attachment = try? UNNotificationAttachment(identifier: "image", url: target) else { return }
            content.attachments = [attachment]
        }.resume()
    }

    /// Estourou o tempo do sistema: entrega o que houver, sem a imagem.
    override func serviceExtensionTimeWillExpire() {
        if let handler = contentHandler, let content = best { handler(content) }
    }
}
