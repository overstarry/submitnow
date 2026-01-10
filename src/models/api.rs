use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct IndexNowRequest {
    pub host: String,
    pub key: String,
    #[serde(rename = "urlList")]
    pub url_list: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct IndexNowResponse {
    // IndexNow API typically returns empty body on success
    // We track response via status codes
}
