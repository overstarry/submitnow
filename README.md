# Tokyo - IndexNow GUI

A desktop GUI application for submitting URLs to IndexNow using the GPUI framework.

## Features

- **Single & Batch URL Submission**: Submit one URL or multiple URLs at once
- **API Key Management**: Generate random API keys or use your own, with persistent storage
- **Submission History**: Track up to 100 recent submissions with status and timestamps
- **URL Validation**: Client-side format validation for URLs, API keys, and hostnames
- **Cross-platform**: Built with Rust and GPUI for macOS, Linux, and Windows support

## Prerequisites

### macOS
- Xcode Command Line Tools for Metal shader compilation:
  ```bash
  xcode-select --install
  ```

### Linux
- Vulkan development packages (distro-specific)

### Windows
- Visual Studio Build Tools

## Building

```bash
# Build the project
cargo build --release

# Run the application
cargo run --release
```

## Project Structure

```
src/
├── main.rs              # Application entry point
├── app.rs               # Main app component with UI
├── models/              # Data models
│   ├── settings.rs      # App settings
│   ├── submission.rs    # Submission records
│   └── api.rs           # IndexNow API types
├── services/            # Business logic
│   ├── api_client.rs    # HTTP client
│   ├── storage.rs       # Persistence layer
│   └── validator.rs     # Validation logic
└── utils/               # Utilities
    └── key_generator.rs # API key generation
```

## Usage

1. **Choose Mode**: Select "Single URL" or "Batch URLs"
2. **Enter URLs**:
   - Single: Enter one URL
   - Batch: Enter multiple URLs (one per line)
3. **Configure**:
   - Host: Your website hostname (e.g., example.com)
   - API Key: Generate a new key or enter your own
4. **Submit**: Click "Submit" to send to IndexNow API
5. **View History**: Check submission status and history below the form

## Configuration Storage

Settings and history are stored in platform-specific directories:

- **macOS**: `~/Library/Application Support/com.tokyo.indexnow-gui/`
- **Linux**: `~/.config/tokyo/indexnow-gui/`
- **Windows**: `C:\Users\<user>\AppData\Roaming\tokyo\indexnow-gui\`

Files:
- `settings.json` - API key, default host, window size
- `history.json` - Last 100 submission records

## IndexNow API

This app submits to `https://api.indexnow.org/indexnow`.

**Note**: You must host your API key file (`{your-key}.txt`) at your website's root directory for IndexNow to verify ownership.

See [indexnow.org/documentation](https://www.indexnow.org/documentation) for details.

## Response Codes

- **200/202**: Success - URLs submitted
- **400**: Bad Request - Invalid request format
- **403**: Forbidden - Invalid or missing API key
- **422**: Unprocessable - Invalid URLs or host mismatch
- **429**: Rate Limit - Too many requests

## Development

Built with:
- [GPUI 0.2.2](https://www.gpui.rs/) - UI framework
- [gpui-component 0.4.0](https://github.com/longbridge/gpui-component) - UI components
- reqwest - HTTP client
- tokio - Async runtime
- serde - Serialization

## License

MIT License - see LICENSE file
