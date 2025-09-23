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

from dekun.core.dataset import Dataset, Info

# Start the editor.
def start_editor(port: int, dataset_path: Path):
    static_directory = Path(__file__).parent.joinpath("static")

    app = Starlette(routes = [
         Mount('/assets', app = StaticFiles(directory = static_directory.joinpath("assets")), name = "assets")
    ])

    dataset = Dataset(dataset_path, "date")

    @app.route("/")
    async def index_html(_: Request):
        return FileResponse(static_directory.joinpath("index.html"))

    @app.route("/api/submit", methods=["PUT"])
    async def submit(request: Request):
        data = await request.json()
        info = Info(data["provider"], data["id"], data["page"], data["author"])

        image_path = dataset_path.joinpath(f"{data['provider']}-{data['id']}-{data['page']}-{data['author']}-image.jpg")
        mask_path = dataset_path.joinpath(f"{data['provider']}-{data['id']}-{data['page']}-{data['author']}-mask.png")
        image_path.write_bytes(b64decode(data["image"]))
        mask_path.write_bytes(b64decode(data["mask"]))

        dataset.add(info, image_path, mask_path)

        return PlainTextResponse("Success", 200)

    @app.route("/api/remove/{id}", methods=["DELETE"])
    async def remove(request: Request):
        id = request.path_params["id"]

        if dataset.has(id):
            entry = dataset.get(id)

            if entry.image_path.exists():
                entry.image_path.unlink()
            if entry.mask_path.exists():
                entry.mask_path.unlink()

            dataset.remove(id)

        return PlainTextResponse("Success", 200)

    @app.route("/api/list")
    async def list(_: Request):
        return JSONResponse(dataset.list(), 200) 

    @app.route("/api/drivers/pixiv/discovery")
    async def pixiv_discovery(_: Request):
        response = send_request("GET", f"https://www.pixiv.net/ajax/illust/discovery?mode=all")

        return Response(response.text, response.status_code, media_type = response.headers.get("Content-Type"))

    @app.route("/api/drivers/pixiv/pages/{id}")
    async def pixiv_pages(request: Request): 
        response = send_request("GET", f"https://www.pixiv.net/ajax/illust/{request.path_params['id']}/pages")

        return Response(response.text, response.status_code, media_type = response.headers.get("Content-Type"))

    @app.route("/api/drivers/nhentai/latest")
    async def nHentai_latest(_: Request):
        response = send_request("GET", "https://api.nhentai.zip/latest")

        return Response(response.text, response.status_code, media_type = response.headers.get("Content-Type"))

    @app.route("/api/drivers/nhentai/pages/{id}")
    async def nHentai_pages(request: Request):
        response = send_request("GET", f"https://api.nhentai.zip/pages/{request.path_params['id']}")

        return Response(response.text, response.status_code, media_type = response.headers.get("Content-Type"))

    @app.route("/resource/image/{name}")
    async def image(request: Request):
        if dataset.has(request.path_params["name"]):
            entry = dataset.get(request.path_params["name"])
        
            return FileResponse(entry.image_path)

        return PlainTextResponse("Not Found", 404)

    @app.route("/resource/mask/{name}")
    async def mask(request: Request):
        if dataset.has(request.path_params["name"]):
            entry = dataset.get(request.path_params["name"])
        
            return FileResponse(entry.mask_path)

        return PlainTextResponse("Not Found", 404)

    @app.route("/resource/pixiv/{id}/{page}")
    async def pixiv_image(request: Request):
        response = send_request("GET", f"https://i.pixiv.cat/img-original/img/{request.path_params['id'].replace('-', '/')}/{request.path_params['page']}") 

        return Response(response.content, response.status_code, headers = {
            "Content-Type": cast(str, response.headers.get("Content-Type")),
            "Cache-Control": "max-age=86400"
        })

    @app.route("/resource/nhentai/{id}/{page}")
    async def nHentai_image(request: Request):
        response = send_request("GET", f"https://i.nhentai.zip/galleries/{request.path_params['id']}/{request.path_params['page']}")

        return Response(response.content, response.status_code, headers = {
            "Content-Type": cast(str, response.headers.get("Content-Type")),
            "Cache-Control": "max-age=86400"
        })

    config = Config()
    config.bind = [f"0.0.0.0:{str(port)}"]

    uvloop.install()
    asyncio.run(serve(app, config)) # type: ignore
