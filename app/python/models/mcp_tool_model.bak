import json
from pathlib import Path
from core.model import Model


class McpToolModel(Model):

    def __init__(self, filename: str = "mcp_tools.json"):
        super().__init__()
        self.config_path = Path(__file__).parent.parent / "config" / filename

    def load_tools(self) -> list:
        """Reusable method to load tools from JSON configuration."""
        if not self.config_path.exists():
            return []
        with open(self.config_path, "r") as f:
            return json.load(f).get("tools", [])
