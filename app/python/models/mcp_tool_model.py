from core.model import Model


class McpToolModel(Model):
    def __init__(self):
        super().__init__()

    def load_tools(self) -> list:
        return [
            {
                "name": "calculator",
                "description": "Evaluates safe mathematical and arithmetic expressions.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "expression": {"type": "string"}
                    },
                    "required": ["expression"]
                },
                "handler": "_run_calculator_tool"
            },
            {
                "name": "stock_quote",
                "description": "Retrieves real-time stock quote and market data for a given ticker symbol.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string"}
                    },
                    "required": ["ticker"]
                },
                "handler": "_run_stock_quote_tool"
            },
            {
                "name": "gmail",
                "description": "Searches, reads, drafts, and manages emails and contacts.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["search", "read", "draft", "manage", "contacts_search", "contacts_list"]
                        },
                        "query": {"type": "string"}
                    },
                    "required": ["action"]
                },
                "handler": "_run_gmail_tool"
            },
            {
                "name": "filesystem_read",
                "description": "Reads files and lists directory contents within permitted workspaces.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"}
                    },
                    "required": ["path"]
                },
                "handler": "_run_filesystem_read_tool"
            },
            {
                "name": "code_executor",
                "description": "Executes sandboxed code snippets and scripts safely.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "language": {"type": "string"},
                        "code": {"type": "string"}
                    },
                    "required": ["language", "code"]
                },
                "handler": "_run_code_executor_tool"
            },
            {
                "name": "database_query",
                "description": "Executes parameterized read-only SQL queries against connected databases.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"}
                    },
                    "required": ["query"]
                },
                "handler": "_run_database_query_tool"
            },
            {
                "name": "weather_forecast",
                "description": "Retrieves current weather conditions and forecasts for a specified location.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string"}
                    },
                    "required": ["location"]
                },
                "handler": "_run_weather_forecast_tool"
            },
            {
                "name": "web_scraper",
                "description": "Fetches and extracts structured text or metadata from permitted web pages.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string"}
                    },
                    "required": ["url"]
                },
                "handler": "_run_web_scraper_tool"
            },
            {
                "name": "json_formatter",
                "description": "Validates, formats, and minifies JSON payloads.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "data": {"type": "string"}
                    },
                    "required": ["data"]
                },
                "handler": "_run_json_formatter_tool"
            },
            {
                "name": "markdown_renderer",
                "description": "Converts Markdown text into clean HTML output.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "markdown": {"type": "string"}
                    },
                    "required": ["markdown"]
                },
                "handler": "_run_markdown_renderer_tool"
            },
            {
                "name": "git_status",
                "description": "Inspects local git repository status, branch info, and staged changes.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"}
                    }
                },
                "handler": "_run_git_status_tool"
            },
            {
                "name": "system_diagnostics",
                "description": "Reports system resource usage, disk space, memory, and uptime.",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                },
                "handler": "_run_system_diagnostics_tool"
            },
            {
                "name": "uuid_generator",
                "description": "Generates cryptographic UUIDs (v4/v7) for unique identification.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "version": {"type": "integer", "default": 4}
                    }
                },
                "handler": "_run_uuid_generator_tool"
            },
            {
                "name": "hash_generator",
                "description": "Computes cryptographic hashes (SHA-256, MD5) for strings or data.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "algorithm": {"type": "string", "default": "sha256"},
                        "data": {"type": "string"}
                    },
                    "required": ["data"]
                },
                "handler": "_run_hash_generator_tool"
            },
            {
                "name": "unit_converter",
                "description": "Converts measurements across metric, imperial, and data units.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "value": {"type": "number"},
                        "from_unit": {"type": "string"},
                        "to_unit": {"type": "string"}
                    },
                    "required": ["value", "from_unit", "to_unit"]
                },
                "handler": "_run_unit_converter_tool"
            },
            {
                "name": "text_summarizer",
                "description": "Summarizes long blocks of text into concise key takeaways.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string"}
                    },
                    "required": ["text"]
                },
                "handler": "_run_text_summarizer_tool"
            },
            {
                "name": "qr_generator",
                "description": "Generates QR code text matrices or data URIs.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "data": {"type": "string"}
                    },
                    "required": ["data"]
                },
                "handler": "_run_qr_generator_tool"
            },
            {
                "name": "dns_lookup",
                "description": "Performs DNS resolution and record lookups for domains.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "domain": {"type": "string"}
                    },
                    "required": ["domain"]
                },
                "handler": "_run_dns_lookup_tool"
            },
            {
                "name": "http_client",
                "description": "Executes safe outbound HTTP GET/POST requests for API testing.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string"},
                        "method": {"type": "string", "default": "GET"}
                    },
                    "required": ["url"]
                },
                "handler": "_run_http_client_tool"
            },
            {
                "name": "password_generator",
                "description": "Generates secure, randomized passwords matching policy requirements.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "length": {"type": "integer", "default": 16}
                    }
                },
                "handler": "_run_password_generator_tool"
            }
        ]

    def load_resources(self) -> list:
        return [
            {
                "uri": "resource://contacts/addressbook",
                "name": "Hotmail Contacts Address Book",
                "description": "Local JSON fixture containing contact details.",
                "mimeType": "application/json"
            },
            {
                "uri": "resource://system/config",
                "name": "System Configuration",
                "description": "Core system configuration settings and environment defaults.",
                "mimeType": "application/json"
            },
            {
                "uri": "resource://docs/api_spec",
                "name": "API Specification",
                "description": "OpenAPI and system technical specification guidelines.",
                "mimeType": "text/markdown"
            },
            {
                "uri": "resource://logs/recent",
                "name": "Recent Logs",
                "description": "Recent application logs and error diagnostics.",
                "mimeType": "text/plain"
            },
            {
                "uri": "resource://templates/email",
                "name": "Email Templates",
                "description": "Standardized email templates and boilerplate structures.",
                "mimeType": "text/plain"
            }
        ]

    def load_prompts(self) -> list:
        return [
            {
                "name": "summarize_email",
                "description": "Summarizes recent emails or contact threads.",
                "arguments": [
                    {
                        "name": "query",
                        "description": "Search query or contact name",
                        "required": True
                    }
                ]
            },
            {
                "name": "code_review",
                "description": "Analyzes submitted code snippets for adherence to MVC, DRY, and security standards.",
                "arguments": [
                    {
                        "name": "code",
                        "description": "Source code snippet to review",
                        "required": True
                    }
                ]
            },
            {
                "name": "debug_assistant",
                "description": "Helps troubleshoot stack traces, network errors, and upstream failures.",
                "arguments": [
                    {
                        "name": "error_log",
                        "description": "Error trace or log output",
                        "required": True
                    }
                ]
            }
        ]

    def get_tool(self, name: str) -> dict | None:
        return next((t for t in self.load_tools() if t["name"] == name), None)

    def get_resource(self, uri: str) -> dict | None:
        return next((r for r in self.load_resources() if r["uri"] == uri), None)

    def get_prompt(self, name: str) -> dict | None:
        return next((p for p in self.load_prompts() if p["name"] == name), None)
