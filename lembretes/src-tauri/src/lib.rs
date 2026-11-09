#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_notification::init());
    // Updater só nos builds de release (feature "updater"): exige chave pública e assinatura.
    #[cfg(all(feature = "updater", desktop))]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());
    builder
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o app");
}
