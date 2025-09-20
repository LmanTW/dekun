from starlette.responses import Response, PlainTextResponse, JSONResponse, FileResponse
from starlette.staticfiles import StaticFiles
from starlette.applications import Starlette
from requests import request as send_request
from starlette.requests import Request
from starlette.routing import Mount
from hypercorn.config import Config
from hypercorn.asyncio import serve
from base64 import b64decode
from pathlib import Path
from typing import cast
import asyncio
import uvloop

from dekun.core.dataset import Dataset

# Start the editor.
def start_editor(port: int, dataset_path: Path):
    static_directory = Path(__file__).parent.joinpath("static")

    app = Starlette(routes = [
         Mount('/assets', app = StaticFiles(directory = static_directory.joinpath("assets")), name = "assets")
    ])

    dataset = Dataset(dataset_path, "date")

    config = Config()
    config.bind = [f"0.0.0.0:{str(port)}"]

    uvloop.install()
    asyncio.run(serve(app, config)) # type: ignore
