use std::sync::Arc;
use gpui::*;
use crate::models::{AppSettings, SubmissionHistory, IndexNowRequest, SubmissionStatus};
use crate::services::{ApiClient, Storage, Validator};
use crate::utils::KeyGenerator;

pub struct IndexNowApp {
    // State
    settings: AppSettings,
    history: SubmissionHistory,

    // Form state
    url_input: String,
    batch_input: String,
    host_input: String,
    api_key_input: String,
    is_batch_mode: bool,

    // UI state
    is_submitting: bool,
    error_message: Option<String>,
    success_message: Option<String>,

    // Services
    api_client: Arc<ApiClient>,
    storage: Arc<Storage>,
}

impl IndexNowApp {
    pub fn new(_cx: &mut WindowContext) -> Self {
        let storage = Arc::new(Storage::new());
        let settings = storage.load_settings().unwrap_or_default();
        let history = storage.load_history().unwrap_or_default();

        Self {
            host_input: settings.default_host.clone(),
            api_key_input: settings.api_key.clone(),
            settings,
            history,
            url_input: String::new(),
            batch_input: String::new(),
            is_batch_mode: false,
            is_submitting: false,
            error_message: None,
            success_message: None,
            api_client: Arc::new(ApiClient::new()),
            storage,
        }
    }

    fn toggle_mode(&mut self, cx: &mut ViewContext<Self>) {
        self.is_batch_mode = !self.is_batch_mode;
        self.error_message = None;
        self.success_message = None;
        cx.notify();
    }

    fn handle_generate_key(&mut self, cx: &mut ViewContext<Self>) {
        self.api_key_input = KeyGenerator::generate_default();
        cx.notify();
    }

    fn handle_submit(&mut self, cx: &mut ViewContext<Self>) {
        self.error_message = None;
        self.success_message = None;

        // Collect URLs
        let urls: Vec<String> = if self.is_batch_mode {
            self.batch_input
                .lines()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        } else {
            vec![self.url_input.trim().to_string()]
        };

        // Validate inputs
        if let Err(e) = Validator::validate_urls(&urls) {
            self.error_message = Some(e.to_string());
            cx.notify();
            return;
        }

        if let Err(e) = Validator::validate_api_key(&self.api_key_input) {
            self.error_message = Some(e.to_string());
            cx.notify();
            return;
        }

        if let Err(e) = Validator::validate_host(&self.host_input) {
            self.error_message = Some(e.to_string());
            cx.notify();
            return;
        }

        // Build request
        let request = IndexNowRequest {
            host: self.host_input.trim().to_string(),
            key: self.api_key_input.trim().to_string(),
            url_list: urls.clone(),
        };

        // Submit
        self.is_submitting = true;
        cx.notify();

        let api_client = self.api_client.clone();
        let storage = self.storage.clone();

        cx.spawn(|this, mut cx| async move {
            let result = api_client.submit(request).await;

            this.update(&mut cx, |this, cx| {
                this.is_submitting = false;

                match result {
                    Ok(record) => {
                        this.success_message = Some(format!("Successfully submitted {} URL(s)", record.urls.len()));
                        this.history.add(record);

                        // Save history
                        let _ = storage.save_history(&this.history);

                        // Save settings
                        this.settings.api_key = this.api_key_input.clone();
                        this.settings.default_host = this.host_input.clone();
                        let _ = storage.save_settings(&this.settings);

                        // Clear form
                        this.url_input.clear();
                        this.batch_input.clear();
                    }
                    Err(e) => {
                        let status = match &e {
                            crate::services::ApiError::BadRequest(msg) => {
                                SubmissionStatus::BadRequest { message: msg.clone() }
                            }
                            crate::services::ApiError::Forbidden => SubmissionStatus::Forbidden,
                            crate::services::ApiError::Invalid(msg) => {
                                SubmissionStatus::Invalid { message: msg.clone() }
                            }
                            crate::services::ApiError::RateLimit => SubmissionStatus::RateLimit,
                            crate::services::ApiError::Network(err) => {
                                SubmissionStatus::Error { message: err.to_string() }
                            }
                        };

                        this.error_message = Some(e.to_string());

                        // Add failed submission to history
                        let record = crate::models::SubmissionRecord {
                            id: uuid::Uuid::new_v4().to_string(),
                            timestamp: chrono::Utc::now(),
                            urls,
                            host: this.host_input.clone(),
                            status,
                            response_code: None,
                        };
                        this.history.add(record);
                        let _ = storage.save_history(&this.history);
                    }
                }

                cx.notify();
            })
            .ok();
        })
        .detach();
    }

    fn render_header(&self, _cx: &mut ViewContext<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .gap_2()
            .child(
                div()
                    .text_size(rems(1.5))
                    .font_weight(FontWeight::BOLD)
                    .child("IndexNow GUI")
            )
            .child(
                div()
                    .text_size(rems(0.875))
                    .text_color(rgb(0x888888))
                    .child("Submit URLs to search engines via IndexNow API")
            )
    }

    fn render_form(&mut self, cx: &mut ViewContext<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .gap_3()
            .p_4()
            .border_1()
            .border_color(rgb(0xcccccc))
            .rounded_md()
            .child(
                // Mode toggle
                div()
                    .flex()
                    .gap_2()
                    .child(
                        div()
                            .px_3()
                            .py_2()
                            .rounded_md()
                            .when(! self.is_batch_mode, |d| d.bg(rgb(0x3b82f6)).text_color(rgb(0xffffff)))
                            .when(self.is_batch_mode, |d| d.bg(rgb(0xe5e7eb)).text_color(rgb(0x000000)))
                            .cursor_pointer()
                            .on_click(cx.listener(|this, _, cx| {
                                if this.is_batch_mode {
                                    this.toggle_mode(cx);
                                }
                            }))
                            .child("Single URL")
                    )
                    .child(
                        div()
                            .px_3()
                            .py_2()
                            .rounded_md()
                            .when(self.is_batch_mode, |d| d.bg(rgb(0x3b82f6)).text_color(rgb(0xffffff)))
                            .when(!self.is_batch_mode, |d| d.bg(rgb(0xe5e7eb)).text_color(rgb(0x000000)))
                            .cursor_pointer()
                            .on_click(cx.listener(|this, _, cx| {
                                if !this.is_batch_mode {
                                    this.toggle_mode(cx);
                                }
                            }))
                            .child("Batch URLs")
                    )
            )
            .child(
                // URL input (conditional)
                div().flex().flex_col().gap_1().child(
                    div().text_size(rems(0.875)).font_weight(FontWeight::MEDIUM).child("URLs")
                ).child(
                    if !self.is_batch_mode {
                        div()
                            .border_1()
                            .border_color(rgb(0xcccccc))
                            .rounded_md()
                            .px_2()
                            .py_1()
                            .child(
                                div()
                                    .id("url-input")
                                    .min_w(px(400.0))
                                    .child(&self.url_input)
                            )
                    } else {
                        div()
                            .border_1()
                            .border_color(rgb(0xcccccc))
                            .rounded_md()
                            .px_2()
                            .py_1()
                            .min_h(px(150.0))
                            .child(
                                div()
                                    .id("batch-input")
                                    .min_w(px(400.0))
                                    .child(&self.batch_input)
                            )
                    }
                )
            )
            .child(
                // Host input
                div().flex().flex_col().gap_1()
                    .child(div().text_size(rems(0.875)).font_weight(FontWeight::MEDIUM).child("Host"))
                    .child(
                        div()
                            .border_1()
                            .border_color(rgb(0xcccccc))
                            .rounded_md()
                            .px_2()
                            .py_1()
                            .child(
                                div()
                                    .id("host-input")
                                    .min_w(px(400.0))
                                    .child(&self.host_input)
                            )
                    )
            )
            .child(
                // API key with generate button
                div().flex().flex_col().gap_1()
                    .child(div().text_size(rems(0.875)).font_weight(FontWeight::MEDIUM).child("API Key"))
                    .child(
                        div().flex().gap_2()
                            .child(
                                div()
                                    .border_1()
                                    .border_color(rgb(0xcccccc))
                                    .rounded_md()
                                    .px_2()
                                    .py_1()
                                    .flex_1()
                                    .child(
                                        div()
                                            .id("key-input")
                                            .child(&self.api_key_input)
                                    )
                            )
                            .child(
                                div()
                                    .px_3()
                                    .py_2()
                                    .rounded_md()
                                    .bg(rgb(0x6b7280))
                                    .text_color(rgb(0xffffff))
                                    .cursor_pointer()
                                    .on_click(cx.listener(|this, _, cx| {
                                        this.handle_generate_key(cx);
                                    }))
                                    .child("Generate")
                            )
                    )
            )
            .child(
                // Messages
                div().flex().flex_col().gap_2()
                    .when_some(self.error_message.clone(), |d, msg| {
                        d.child(
                            div()
                                .p_3()
                                .rounded_md()
                                .bg(rgb(0xfee2e2))
                                .text_color(rgb(0x991b1b))
                                .child(msg)
                        )
                    })
                    .when_some(self.success_message.clone(), |d, msg| {
                        d.child(
                            div()
                                .p_3()
                                .rounded_md()
                                .bg(rgb(0xd1fae5))
                                .text_color(rgb(0x065f46))
                                .child(msg)
                        )
                    })
            )
            .child(
                // Submit button
                div()
                    .px_4()
                    .py_2()
                    .rounded_md()
                    .bg(if self.is_submitting { rgb(0x9ca3af) } else { rgb(0x3b82f6) })
                    .text_color(rgb(0xffffff))
                    .cursor(if self.is_submitting { CursorStyle::Default } else { CursorStyle::PointingHand })
                    .when(!self.is_submitting, |d| {
                        d.on_click(cx.listener(|this, _, cx| {
                            this.handle_submit(cx);
                        }))
                    })
                    .child(if self.is_submitting { "Submitting..." } else { "Submit" })
            )
    }

    fn render_history(&self, _cx: &mut ViewContext<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .gap_2()
            .child(
                div()
                    .text_size(rems(1.125))
                    .font_weight(FontWeight::BOLD)
                    .child("Submission History")
            )
            .child(
                div()
                    .flex()
                    .flex_col()
                    .gap_2()
                    .max_h(px(300.0))
                    .overflow_y_scroll()
                    .border_1()
                    .border_color(rgb(0xcccccc))
                    .rounded_md()
                    .p_3()
                    .children(
                        if self.history.records.is_empty() {
                            vec![
                                div()
                                    .text_color(rgb(0x888888))
                                    .child("No submissions yet")
                            ]
                        } else {
                            self.history.records.iter().map(|record| {
                                let status_color = match record.status {
                                    SubmissionStatus::Success => rgb(0x10b981),
                                    SubmissionStatus::BadRequest { .. } => rgb(0xef4444),
                                    SubmissionStatus::Forbidden => rgb(0xef4444),
                                    SubmissionStatus::Invalid { .. } => rgb(0xef4444),
                                    SubmissionStatus::RateLimit => rgb(0xf59e0b),
                                    SubmissionStatus::Error { .. } => rgb(0xef4444),
                                };

                                div()
                                    .flex()
                                    .gap_2()
                                    .p_2()
                                    .border_1()
                                    .border_color(rgb(0xe5e7eb))
                                    .rounded_md()
                                    .child(
                                        div()
                                            .w(px(8.0))
                                            .h(px(8.0))
                                            .rounded_full()
                                            .bg(status_color)
                                    )
                                    .child(
                                        div()
                                            .flex()
                                            .flex_col()
                                            .gap_1()
                                            .flex_1()
                                            .child(
                                                div()
                                                    .flex()
                                                    .justify_between()
                                                    .child(
                                                        div()
                                                            .font_weight(FontWeight::MEDIUM)
                                                            .child(record.status.display_text())
                                                    )
                                                    .child(
                                                        div()
                                                            .text_size(rems(0.75))
                                                            .text_color(rgb(0x888888))
                                                            .child(record.timestamp.format("%Y-%m-%d %H:%M:%S").to_string())
                                                    )
                                            )
                                            .child(
                                                div()
                                                    .text_size(rems(0.875))
                                                    .text_color(rgb(0x666666))
                                                    .child(format!("{} URL(s) - {}", record.urls.len(), record.host))
                                            )
                                    )
                            }).collect()
                        }
                    )
            )
    }
}

impl Render for IndexNowApp {
    fn render(&mut self, cx: &mut ViewContext<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .w_full()
            .h_full()
            .p_4()
            .gap_4()
            .bg(rgb(0xffffff))
            .child(self.render_header(cx))
            .child(self.render_form(cx))
            .child(self.render_history(cx))
    }
}
