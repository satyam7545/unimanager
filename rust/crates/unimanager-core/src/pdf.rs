use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PdfError {
    #[error("Failed to read PDF file: {0}")]
    Io(#[from] std::io::Error),

    #[error("PDF text extraction failed: {0}")]
    Extract(String),
}

/// Extracts plain text from a local PDF file for AI summarization and RAG.
pub fn extract_text(path: &Path) -> Result<String, PdfError> {
    let bytes = std::fs::read(path)?;
    pdf_extract::extract_text_from_mem(&bytes).map_err(|e| PdfError::Extract(e.to_string()))
}
