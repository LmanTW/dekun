from requests import request as send_request
from flask import Flask, Response, request
from base64 import b64decode
from random import random
from pathlib import Path
from math import floor

API_HOST = "https://api.nhentai.zip"
IMAGE_HOST = "https://i.nhentai.zip"

def start_editor(dataset_path: Path):
    app = Flask(__name__, static_folder="public")

    @app.route("/")
    def index():
        return app.send_static_file("index.html")

    @app.route("/index.js")
    def script():
        return app.send_static_file("index.js")

    @app.route("/next")
    def next():
        while True:
            latest = send_request("GET",  API_HOST + "/latest").json()
            random_id = round(random() * latest)
            gallery_pages = send_request("GET",  API_HOST + f"/pages/{random_id}").json()
            random_page = floor(random() * len(gallery_pages))

            if not dataset_path.joinpath(f"{random_id}-{random_page}-image.jpg") or dataset_path.joinpath(f"{random_id}-{random_page}-mask.png"):
                return {
                    "id": random_id,
                    "media": gallery_pages[random_page].split('/')[-2],
                    "page": gallery_pages[random_page].split('/')[-1]
                }

    @app.route("/save", methods=["PUT"])
    def save():
        data = request.get_json()

        id = request.args.get('id')
        page = request.args.get('page') 

        dataset_path.joinpath(f"{id}-{page}-image.jpg").write_bytes(b64decode(data["original"]))
        dataset_path.joinpath(f"{id}-{page}-mask.png").write_bytes(b64decode(data["mask"]))

        return "Success"

    @app.route("/image/<id>/<page>")
    def image(id: str, page: str):
        response = send_request("GET", IMAGE_HOST + f"/galleries/{id}/{page}")

        if response.status_code != 200:
            return response.content, response.status_code

        page_format = Path(page).suffix
        content_type = ""

        if page_format == ".jpg":
            content_type = "image/jpeg"
        elif page_format == ".png":
            content_type = "image/png"
        elif page_format == ".webp":
            content_type = "image/webp"

        return Response(response.content, content_type=content_type)

    app.run(host="0.0.0.0", port=8080, debug=True)
