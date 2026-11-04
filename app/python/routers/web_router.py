from fastapi import APIRouter
from controllers.home_controller import HomeController

web_router = APIRouter(prefix="/home", tags=["Web MVC"])
home_controller = HomeController()


@web_router.get("/index")
async def home_index():
    return await home_controller.index()
