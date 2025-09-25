from starlette.responses import Response, PlainTextResponse, JSONResponse, FileResponse
from starlette.staticfiles import StaticFiles
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.routing import Mount
from hypercorn.config import Config
from hypercorn.asyncio import serve
from typing import Union
from pathlib import Path
import asyncio
import uvloop

from dekun.inpainter.model import Inpainter
from dekun.marker.model import Marker

# Start the playground.
def start_playground(port: int, marker: Union[Marker, None], inpainter: Union[Inpainter, None]):
    static_directory = Path(__file__).parent.joinpath("static")

    app = Starlette(routes = [
         Mount('/assets', app = StaticFiles(directory = static_directory.joinpath("assets")), name = "assets")
    ])

    @app.route("/")
    async def index_html(_: Request):
        return FileResponse(static_directory.joinpath("index.html"))

    config = Config()
    config.bind = [f"0.0.0.0:{str(port)}"]

    uvloop.install()
    asyncio.run(serve(app, config)) # type: ignore
