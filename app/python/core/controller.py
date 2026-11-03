"""
Sharpishly MVC Base Controller
"""
class Controller:
    def jsonResponse(self, data: dict, status: int = 200) -> dict:
        return {"status": status, "data": data}

    def errorResponse(self, message: str, status: int = 400) -> dict:
        return {"status": status, "error": message}
