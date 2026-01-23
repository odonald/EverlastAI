mod commands;

use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Listener, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_api_key,
            commands::save_api_key,
            commands::delete_api_key,
            commands::get_api_keys,
            commands::save_api_keys,
            commands::set_recording_state,
            commands::get_recording_state,
            // Session storage commands
            commands::list_sessions,
            commands::save_session,
            commands::get_session,
            commands::delete_session,
            commands::update_session_metadata,
        ])
        .setup(|app| {
            // Register global hotkey
            let hotkey_handle = app.handle().clone();

            #[cfg(desktop)]
            {
                // Use Cmd/Ctrl + Shift + R for "Record"
                let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyR);

                // Register the callback
                if let Err(e) = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        println!("Global hotkey pressed!");

                        if let Some(window) = hotkey_handle.get_webview_window("main") {
                            // Always bring app to front and focus
                            println!("Hotkey: bringing app to front...");
                            let _ = window.show();
                            let _ = window.set_focus();

                            // Trigger recording toggle
                            let js_code = "window.dispatchEvent(new Event('toggle-recording'));";
                            match window.eval(js_code) {
                                Ok(_) => println!("Recording toggle triggered"),
                                Err(e) => eprintln!("Failed to trigger recording: {}", e),
                            }
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

            // Setup system tray
            #[cfg(desktop)]
            {
                // Create tray menu
                let quit = MenuItem::with_id(app, "quit", "Quit Everlast AI Recorder", true, None::<&str>)?;
                let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show, &quit])?;

                // Load tray icon (use 32x32 for menu bar)
                let icon = Image::from_path("icons/32x32.png").unwrap_or_else(|_| {
                    // Fallback to embedded icon
                    Image::from_bytes(include_bytes!("../icons/32x32.png")).expect("Failed to load tray icon")
                });

                let _tray = TrayIconBuilder::with_id(commands::TRAY_ID)
                    .icon(icon)
                    .menu(&menu)
                    .tooltip("Everlast AI Recorder - Voice to Text")
                    .on_menu_event(move |app, event| {
                        match event.id.as_ref() {
                            "quit" => {
                                app.exit(0);
                            }
                            "show" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(move |tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    })
                    .build(app)?;

                println!("System tray initialized");
            }

            // Handle deep-link events (for OAuth callback)
            #[cfg(desktop)]
            {
                let deep_link_handle = app.handle().clone();
                app.listen("deep-link://new-url", move |event| {
                    let payload = event.payload();
                    println!("Deep-link received: {}", payload);

                    // Parse the payload - it's a JSON array of URLs
                    let url = if let Ok(urls) = serde_json::from_str::<Vec<String>>(payload) {
                        urls.into_iter().next()
                    } else {
                        // Fallback: try to use payload directly as URL
                        Some(payload.trim_matches('"').to_string())
                    };

                    if let Some(url) = url {
                        println!("Processing auth callback URL: {}", url);
                        // Show window and pass the URL to frontend
                        if let Some(window) = deep_link_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            // Dispatch event to frontend with the callback URL
                            let js = format!(
                                "window.dispatchEvent(new CustomEvent('auth-callback', {{ detail: '{}' }}))",
                                url.replace('\\', "\\\\").replace('\'', "\\'")
                            );
                            println!("Executing JS: {}", js);
                            let _ = window.eval(&js);
                        }
                    }
                });
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide window instead of closing when user clicks the close button
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Prevent the window from being destroyed
                api.prevent_close();
                // Hide it instead
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
