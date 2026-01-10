use reqwest::Client;
use anyhow::Result;
use thiserror::Error;
use chrono::Utc;
use uuid::Uuid;

use crate::models::{IndexNowRequest, SubmissionRecord, SubmissionStatus};

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("Bad request: {0}")]
    BadRequest(String),
    #[error("Forbidden: Invalid API key")]
    Forbidden,
    #[error("Invalid URLs: {0}")]
    Invalid(String),
    #[error("Rate limit exceeded")]
    RateLimit,
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
}

pub struct ApiClient {
    client: Client,
    endpoint: String,
}

impl ApiClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            endpoint: "https://api.indexnow.org/indexnow".to_string(),
        }
    }

    pub async fn submit(&self, request: IndexNowRequest) -> Result<SubmissionRecord, ApiError> {
        let response = self.client
            .post(&self.endpoint)
            .json(&request)
            .send()
            .await?;

        let status = response.status();
        let status_code = status.as_u16();

        match status_code {
            200 | 202 => Ok(SubmissionRecord {
                id: Uuid::new_v4().to_string(),
                timestamp: Utc::now(),
                urls: request.url_list,
                host: request.host,
                status: SubmissionStatus::Success,
                response_code: Some(status_code),
            }),
            400 => {
                let message = response.text().await.unwrap_or_else(|_| "Bad request".to_string());
                Err(ApiError::BadRequest(message))
            },
            403 => Err(ApiError::Forbidden),
            422 => {
                let message = response.text().await.unwrap_or_else(|_| "Invalid URLs".to_string());
                Err(ApiError::Invalid(message))
            },
            429 => Err(ApiError::RateLimit),
            _ => Err(ApiError::Network(
                response.error_for_status().unwrap_err()
            )),
        }
    }
}

impl Default for ApiClient {
    fn default() -> Self {
        Self::new()
    }
}
