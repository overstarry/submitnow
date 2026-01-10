use url::Url;
use anyhow::{Result, bail};

pub struct Validator;

impl Validator {
    pub fn validate_url(url: &str) -> Result<()> {
        let parsed = Url::parse(url)?;

        if parsed.scheme() != "http" && parsed.scheme() != "https" {
            bail!("URL must use http or https scheme");
        }

        if parsed.host_str().is_none() {
            bail!("URL must have a valid host");
        }

        Ok(())
    }

    pub fn validate_urls(urls: &[String]) -> Result<Vec<String>> {
        if urls.is_empty() {
            bail!("At least one URL is required");
        }

        if urls.len() > 10_000 {
            bail!("Maximum 10,000 URLs per submission");
        }

        let mut errors = Vec::new();
        for (i, url) in urls.iter().enumerate() {
            if let Err(e) = Self::validate_url(url) {
                errors.push(format!("Line {}: {}", i + 1, e));
            }
        }

        if !errors.is_empty() {
            bail!("Validation errors:\n{}", errors.join("\n"));
        }

        Ok(urls.to_vec())
    }

    pub fn validate_api_key(key: &str) -> Result<()> {
        if key.is_empty() {
            bail!("API key is required");
        }

        if key.len() < 8 || key.len() > 128 {
            bail!("API key must be 8-128 characters");
        }

        if !key.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
            bail!("API key must contain only a-z, A-Z, 0-9, and dashes");
        }

        Ok(())
    }

    pub fn validate_host(host: &str) -> Result<()> {
        if host.is_empty() {
            bail!("Host is required");
        }

        // Try parsing as URL to validate host format
        let test_url = format!("https://{}", host);
        Url::parse(&test_url)?;

        Ok(())
    }
}
