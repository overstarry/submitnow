use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SubmissionStatus {
    Success,
    BadRequest { message: String },
    Forbidden,
    Invalid { message: String },
    RateLimit,
    Error { message: String },
}

impl SubmissionStatus {
    pub fn display_text(&self) -> &str {
        match self {
            SubmissionStatus::Success => "Success",
            SubmissionStatus::BadRequest { .. } => "Bad Request",
            SubmissionStatus::Forbidden => "Forbidden",
            SubmissionStatus::Invalid { .. } => "Invalid",
            SubmissionStatus::RateLimit => "Rate Limit",
            SubmissionStatus::Error { .. } => "Error",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmissionRecord {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub urls: Vec<String>,
    pub host: String,
    pub status: SubmissionStatus,
    pub response_code: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SubmissionHistory {
    pub records: Vec<SubmissionRecord>,
}

impl SubmissionHistory {
    pub fn add(&mut self, record: SubmissionRecord) {
        self.records.insert(0, record); // Most recent first
        // Keep only last 100 records
        if self.records.len() > 100 {
            self.records.truncate(100);
        }
    }
}
