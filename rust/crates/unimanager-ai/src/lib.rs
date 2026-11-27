use serde::{Deserialize, Serialize};
use serde_json::json;
use thiserror::Error;
use unimanager_db::models::{AISetting, Message};

#[derive(Debug, Error)]
pub enum AiError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Provider returned error ({status}): {body}")]
    Provider { status: u16, body: String },

    #[error("Missing API key for provider {0}")]
    MissingApiKey(String),

    #[error("Unexpected response format: {0}")]
    Parse(String),
}

pub type AiResult<T> = Result<T, AiError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    pub provider: String,
    pub api_key: Option<String>,
    pub endpoint: Option<String>,
    pub model: String,
    pub temperature: f64,
    pub max_tokens: i32,
    pub system_prompt: Option<String>,
    pub messages: Vec<ChatTurn>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatTurn {
    pub role: String,
    pub content: String,
}

impl From<&Message> for ChatTurn {
    fn from(m: &Message) -> Self {
        Self {
            role: m.role.to_lowercase(),
            content: m.content.clone(),
        }
    }
}

pub struct AiClient {
    http: reqwest::Client,
}

impl Default for AiClient {
    fn default() -> Self {
        Self::new()
    }
}

impl AiClient {
    pub fn new() -> Self {
        Self {
            http: reqwest::Client::new(),
        }
    }

    pub fn request_from_setting(setting: &AISetting, turns: Vec<ChatTurn>) -> ChatCompletionRequest {
        let default_model = match setting.provider.as_str() {
            "gemini" => "gemini-2.0-flash",
            "claude" => "claude-3-5-sonnet-latest",
            "deepseek" => "deepseek-chat",
            "ollama" => "llama3.2",
            "lmstudio" => "local-model",
            _ => "gpt-4o-mini",
        };

        ChatCompletionRequest {
            provider: setting.provider.clone(),
            api_key: setting.api_key.clone(),
            endpoint: setting.endpoint.clone(),
            model: setting
                .model
                .clone()
                .filter(|m| !m.is_empty())
                .unwrap_or_else(|| default_model.to_string()),
            temperature: setting.temperature,
            max_tokens: setting.max_tokens,
            system_prompt: setting.system_prompt.clone(),
            messages: turns,
        }
    }

    /// Dispatches a chat completion across OpenAI-compatible, Gemini, Claude, DeepSeek, Ollama, or LMStudio.
    pub async fn complete(&self, req: &ChatCompletionRequest) -> AiResult<String> {
        match req.provider.as_str() {
            "gemini" => self.complete_gemini(req).await,
            "claude" => self.complete_claude(req).await,
            "ollama" => self.complete_ollama(req).await,
            _ => self.complete_openai_compatible(req).await,
        }
    }

    async fn complete_openai_compatible(&self, req: &ChatCompletionRequest) -> AiResult<String> {
        let base_url = match req.provider.as_str() {
            "deepseek" => req
                .endpoint
                .as_deref()
                .unwrap_or("https://api.deepseek.com/v1"),
            "lmstudio" => req
                .endpoint
                .as_deref()
                .unwrap_or("http://localhost:1234/v1"),
            _ => req
                .endpoint
                .as_deref()
                .unwrap_or("https://api.openai.com/v1"),
        };

        let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));
        let mut msgs = Vec::new();
        if let Some(sys) = &req.system_prompt {
            if !sys.trim().is_empty() {
                msgs.push(json!({ "role": "system", "content": sys }));
            }
        }
        for turn in &req.messages {
            msgs.push(json!({ "role": turn.role, "content": turn.content }));
        }

        let mut builder = self.http.post(&url).json(&json!({
            "model": req.model,
            "messages": msgs,
            "temperature": req.temperature,
            "max_tokens": req.max_tokens
        }));

        if let Some(key) = &req.api_key {
            if !key.is_empty() {
                builder = builder.bearer_auth(key);
            }
        } else if req.provider != "lmstudio" {
            return Err(AiError::MissingApiKey(req.provider.clone()));
        }

        let resp = builder.send().await?;
        let status = resp.status();
        let text = resp.text().await?;
        if !status.is_success() {
            return Err(AiError::Provider {
                status: status.as_u16(),
                body: text,
            });
        }

        let val: serde_json::Value =
            serde_json::from_str(&text).map_err(|e| AiError::Parse(e.to_string()))?;
        val["choices"][0]["message"]["content"]
            .as_str()
            .map(str::to_string)
            .ok_or_else(|| AiError::Parse("Missing choices[0].message.content".to_string()))
    }

    async fn complete_gemini(&self, req: &ChatCompletionRequest) -> AiResult<String> {
        let key = req
            .api_key
            .as_deref()
            .filter(|k| !k.is_empty())
            .ok_or_else(|| AiError::MissingApiKey("gemini".to_string()))?;

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            req.model, key
        );

        let contents: Vec<serde_json::Value> = req
            .messages
            .iter()
            .map(|m| {
                let role = if m.role == "assistant" { "model" } else { "user" };
                json!({
                    "role": role,
                    "parts": [{ "text": m.content }]
                })
            })
            .collect();

        let resp = self
            .http
            .post(&url)
            .json(&json!({
                "contents": contents,
                "generationConfig": {
                    "temperature": req.temperature,
                    "maxOutputTokens": req.max_tokens
                }
            }))
            .send()
            .await?;

        let status = resp.status();
        let text = resp.text().await?;
        if !status.is_success() {
            return Err(AiError::Provider {
                status: status.as_u16(),
                body: text,
            });
        }

        let val: serde_json::Value =
            serde_json::from_str(&text).map_err(|e| AiError::Parse(e.to_string()))?;
        val["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .map(str::to_string)
            .ok_or_else(|| AiError::Parse("Missing Gemini candidate text".to_string()))
    }

    async fn complete_claude(&self, req: &ChatCompletionRequest) -> AiResult<String> {
        let key = req
            .api_key
            .as_deref()
            .filter(|k| !k.is_empty())
            .ok_or_else(|| AiError::MissingApiKey("claude".to_string()))?;

        let msgs: Vec<serde_json::Value> = req
            .messages
            .iter()
            .map(|m| json!({ "role": m.role, "content": m.content }))
            .collect();

        let resp = self
            .http
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", key)
            .header("anthropic-version", "2023-06-01")
            .json(&json!({
                "model": req.model,
                "max_tokens": req.max_tokens,
                "system": req.system_prompt.clone().unwrap_or_default(),
                "messages": msgs
            }))
            .send()
            .await?;

        let status = resp.status();
        let text = resp.text().await?;
        if !status.is_success() {
            return Err(AiError::Provider {
                status: status.as_u16(),
                body: text,
            });
        }

        let val: serde_json::Value =
            serde_json::from_str(&text).map_err(|e| AiError::Parse(e.to_string()))?;
        val["content"][0]["text"]
            .as_str()
            .map(str::to_string)
            .ok_or_else(|| AiError::Parse("Missing Claude content[0].text".to_string()))
    }

    async fn complete_ollama(&self, req: &ChatCompletionRequest) -> AiResult<String> {
        let base_url = req
            .endpoint
            .as_deref()
            .unwrap_or("http://localhost:11434");
        let url = format!("{}/api/chat", base_url.trim_end_matches('/'));

        let msgs: Vec<serde_json::Value> = req
            .messages
            .iter()
            .map(|m| json!({ "role": m.role, "content": m.content }))
            .collect();

        let resp = self
            .http
            .post(&url)
            .json(&json!({
                "model": req.model,
                "messages": msgs,
                "stream": false
            }))
            .send()
            .await?;

        let status = resp.status();
        let text = resp.text().await?;
        if !status.is_success() {
            return Err(AiError::Provider {
                status: status.as_u16(),
                body: text,
            });
        }

        let val: serde_json::Value =
            serde_json::from_str(&text).map_err(|e| AiError::Parse(e.to_string()))?;
        val["message"]["content"]
            .as_str()
            .map(str::to_string)
            .ok_or_else(|| AiError::Parse("Missing Ollama message.content".to_string()))
    }
}
