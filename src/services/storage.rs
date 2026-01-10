use std::path::PathBuf;
use directories::ProjectDirs;
use anyhow::Result;
use crate::models::{AppSettings, SubmissionHistory};

pub struct Storage {
    config_dir: PathBuf,
}

impl Storage {
    pub fn new() -> Self {
        let project_dirs = ProjectDirs::from("com", "tokyo", "indexnow-gui")
            .expect("Failed to determine config directory");

        let config_dir = project_dirs.config_dir().to_path_buf();
        std::fs::create_dir_all(&config_dir).ok();

        Self { config_dir }
    }

    pub fn load_settings(&self) -> Result<AppSettings> {
        let path = self.config_dir.join("settings.json");
        if !path.exists() {
            return Ok(AppSettings::default());
        }
        let content = std::fs::read_to_string(path)?;
        Ok(serde_json::from_str(&content)?)
    }

    pub fn save_settings(&self, settings: &AppSettings) -> Result<()> {
        let path = self.config_dir.join("settings.json");
        let content = serde_json::to_string_pretty(settings)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    pub fn load_history(&self) -> Result<SubmissionHistory> {
        let path = self.config_dir.join("history.json");
        if !path.exists() {
            return Ok(SubmissionHistory::default());
        }
        let content = std::fs::read_to_string(path)?;
        Ok(serde_json::from_str(&content)?)
    }

    pub fn save_history(&self, history: &SubmissionHistory) -> Result<()> {
        let path = self.config_dir.join("history.json");
        let content = serde_json::to_string_pretty(history)?;
        std::fs::write(path, content)?;
        Ok(())
    }
}
