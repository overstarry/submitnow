use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub api_key: String,
    pub default_host: String,
    #[serde(default = "default_window_width")]
    pub window_width: u32,
    #[serde(default = "default_window_height")]
    pub window_height: u32,
}

fn default_window_width() -> u32 {
    800
}

fn default_window_height() -> u32 {
    600
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            default_host: String::new(),
            window_width: 800,
            window_height: 600,
        }
    }
}
