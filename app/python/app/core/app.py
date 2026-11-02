import asyncio
import importlib
import inspect
import os
import re
import sys
import urllib.parse

class App:
    def __init__(self, request_uri: str | None = None):
        if request_uri is None:
            request_uri = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("REQUEST_URI", "/")

        self.uri_path = urllib.parse.urlparse(request_uri).path.strip("/")

        if self.uri_path.startswith("py/"):
            self.uri_path = self.uri_path[3:]

    def dispatch(self):
        parts = [p for p in self.uri_path.split("/") if p]

        controller_name = parts[0] if parts else "home"
        action_name = parts[1] if len(parts) > 1 else "index"
        params = parts[2:]

        if not re.fullmatch(r"[a-z][a-z0-9_]*", controller_name):
            raise ValueError(f"Invalid controller name: {controller_name}")

        if not re.fullmatch(r"[a-z][a-z0-9_]*", action_name) or action_name.startswith("_"):
            raise ValueError(f"Invalid action name: {action_name}")

        module_path = f"app.controllers.{controller_name}_controller"
        class_name = f"{controller_name.capitalize()}Controller"

        module = importlib.import_module(module_path)
        controller_cls = getattr(module, class_name)
        controller = controller_cls()

        if not hasattr(controller, action_name):
            raise AttributeError(f"Action '{action_name}' not found on {class_name}")

        method = getattr(controller, action_name)
        result = method(*params)

        if inspect.iscoroutine(result):
            return asyncio.run(result)

        return result
