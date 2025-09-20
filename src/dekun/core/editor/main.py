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
    public_directory = Path(__file__).parent.joinpath("public")

    app = Starlette(routes = [
         Mount('/drivers', app = StaticFiles(directory = public_directory.joinpath("drivers")), name = "static")
    ])

    dataset = Dataset(dataset_path, "date")

    @app.route("/")
    async def editor_html(_: Request):
        return FileResponse(public_directory.joinpath("editor.html"))

    @app.route("/editor.js")
    async def editor_script(_: Request):
        return FileResponse(public_directory.joinpath("editor.js"))

    @app.route("/editor.css")
    async def editor_style(_: Request):
        return FileResponse(public_directory.joinpath("editor.css"))

    @app.route("/api/submit/{name}", methods=["PUT"])
    async def submit(request: Request):
        name = request.path_params["name"]
        data = await request.json()

        image_path = dataset_path.joinpath(f"{name}-image.jpg")
        mask_path = dataset_path.joinpath(f"{name}-mask.png")
        image_path.write_bytes(b64decode(data["image"]))
        mask_path.write_bytes(b64decode(data["mask"]))

        dataset.add(name, image_path, mask_path)

        return PlainTextResponse("Success", 200)

    @app.route("/api/check/{name}")
    async def check(request: Request):
        return JSONResponse(dataset.has(request.path_params["name"]), 200)

    @app.route("/api/list")
    async def list(request: Request):
        return JSONResponse(dataset.list(), 200)

    @app.route("/api/remove/{name}", methods=["DELETE"])
    async def remove(request: Request):
        name = request.path_params["name"]

        if dataset.has(name):
            entry = dataset.get(name)

            if entry.image_path.exists():
                entry.image_path.unlink()
            if entry.mask_path.exists():
                entry.mask_path.unlink()

            dataset.remove(name)

            return PlainTextResponse("Success", 200)

        return PlainTextResponse("Failed", 500)

    @app.route("/api/drivers/pixiv/discovery")
    async def pixiv_discovery(_: Request):
        response = send_request("GET", f"https://www.pixiv.net/ajax/illust/discovery?mode=all")

        return Response(response.text, response.status_code, media_type = response.headers.get("Content-Type"))

    @app.route("/api/drivers/pixiv/pages/{id}")
    async def pixiv_pages(request: Request): 
        response = send_request("GET", f"https://www.pixiv.net/ajax/illust/{request.path_params['id']}/pages")

        return Response(response.text, response.status_code, media_type = response.headers.get("Content-Type"))

    @app.route("/api/drivers/nHentai/latest")
    async def nHentai_latest(_: Request):
        response = send_request("GET", "https://api.nhentai.zip/latest")

        return Response(response.text, response.status_code, media_type = response.headers.get("Content-Type"))

    @app.route("/api/drivers/nHentai/pages/{id}")
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

    @app.route("/resource/nHentai/{id}/{page}")
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
