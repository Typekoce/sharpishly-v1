from core.controller import Controller


class HomeController(Controller):

    async def index(self) -> dict:
        return {
            "status": "success",
            "message": "Sharpishly Python MVC online",
            "route": "home/index"
        }
