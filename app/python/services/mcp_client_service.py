"""
Service layer for managing stdio connection parameters and pre-flight environment checks.
"""
import os
import sys
import subprocess
from mcp import StdioServerParameters

class McpClientService:
    @staticmethod
    def checkGpgAgent() -> bool:
        """
        Pre-flight check to verify that the local GPG agent is running 
        and responsive for password retrieval.
        """
        try:
            result = subprocess.run(
                ["gpg-connect-agent", "/bye"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=3
            )
            return result.returncode == 0
        except Exception as e:
            return False

    @staticmethod
    def getServerParameters(scriptRoute: str) -> StdioServerParameters:
        # services -> python -> app -> PROJECT_ROOT (3 levels up)
        projectRoot = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
        venvPython = os.path.join(projectRoot, "build/mcp/.venv/bin/python3")
        indexPy = os.path.join(projectRoot, "app/python/index.py")

        if not os.path.exists(venvPython):
            venvPython = sys.executable

        # Pre-flight check for Gmail/Himalaya endpoints
        if "gmail" in scriptRoute:
            if not McpClientService.checkGpgAgent():
                raise RuntimeError(
                    "[!] GPG agent is unresponsive or locked. "
                    "Run 'pass show email/mysharpishly' in your terminal to unlock your key before proceeding."
                )

        env = os.environ.copy()

        return StdioServerParameters(
            command=venvPython,
            args=[indexPy, scriptRoute],
            env=env
        )
