mod commands;

use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::get_api_key,
            commands::save_api_key,
            commands::delete_api_key,
            commands::get_api_keys,
            commands::save_api_keys,
        ])
        .setup(|app| {
            // Register global hotkey
            let handle = app.handle().clone();

            #[cfg(desktop)]
            {
                // Use Cmd/Ctrl + Shift + R for "Record"
                let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyR);

                // Register the callback
                if let Err(e) = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        // Emit event to frontend
                        if let Some(window) = handle.get_webview_window("main") {
                            let _ = window.eval("window.dispatchEvent(new Event('toggle-recording'))");
                        }
                    }
                }) {
                    eprintln!("Failed to set shortcut callback: {}", e);
                }

                // Try to register the shortcut, but don't crash if it fails
                match app.global_shortcut().register(shortcut) {
                    Ok(_) => println!("Global hotkey registered: Cmd+Shift+R"),
                    Err(e) => {
                        eprintln!("Failed to register global hotkey: {}. The app will still work, but hotkey activation is disabled.", e);
                        eprintln!("On macOS, you may need to grant Accessibility permissions in System Preferences > Privacy & Security > Accessibility");
                    }
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
