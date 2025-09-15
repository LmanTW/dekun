from requests import request as send_request
from flask import Flask, Response, request
from base64 import b64decode
from pathlib import Path
import json

from dekun.core.dataset import Dataset 

def start_editor(port: int, dataset_path: Path):
    app = Flask(__name__, static_folder="public")
    dataset = Dataset(dataset_path)

    @app.route("/")
    def index():
        return app.send_static_file("./editor.html")

    @app.route("/editor.js")
    def editor_script():
        return app.send_static_file("./editor.js")

    @app.route("/editor.css")
    def editor_style():
        return app.send_static_file("./editor.css")

    @app.route("/drivers/nHentai.js")
    def nHentai_driver():
        return app.send_static_file("./drivers/nHentai.js")

    @app.route("/drivers/nHentai/latest")
    def nHentai_latest():
        return Response(send_request("GET", "https://api.nhentai.zip/latest").text, content_type="application/json")

    @app.route("/drivers/nHentai/pages/<id>")
    def nHentai_pages(id: str):
        return Response(send_request("GET", f"https://api.nhentai.zip/pages/{id}").text, content_type="application/json")

    @app.route("/drivers/nHentai/image/<id>/<page>")
    def nHentai_image(id: str, page: str):
        response = send_request("GET", f"https://i.nhentai.zip/galleries/{id}/{page}")

        if response.status_code != 200:
            return response.content, response.status_code

        image_format = Path(page).suffix
        content_type = ""

        if image_format == ".jpg":
            content_type = "image/jpeg"
        elif image_format == ".png":
            content_type = "image/png"
        elif image_format == ".webp":
            content_type = "image/webp"

        response = Response(response.content)
        response.headers['Content-Type'] = content_type
        response.headers["Cache-Control"] = "max-age=86400"

        return response

    @app.route("/drivers/pixiv.js")
    # Ignore
    def pixiv_driver():
        return app.send_static_file("./drivers/pixiv.js")

    @app.route("/drivers/pixiv/discovery")
    def pixiv_discovery():
        return Response(send_request("GET", f"https://www.pixiv.net/ajax/illust/discovery?mode=all").text, content_type="application/json")

    @app.route("/drivers/pixiv/pages/<id>")
    def pixiv_pages(id):
        return Response(send_request("GET", f"https://www.pixiv.net/ajax/illust/{id}/pages").text, content_type="application/json")

    @app.route("/drivers/pixiv/image/<id>/<page>")
    def pixiv_image(id: str, page: str):
        response = send_request("GET", f"https://i.pixiv.cat/img-original/img/{id.replace('-', '/')}/{page}")

        if response.status_code != 200:
            return response.content, response.status_code

        image_format = Path(page).suffix
        content_type = ""

        if image_format == ".jpg":
            content_type = "image/jpeg"
        elif image_format == ".png":
            content_type = "image/png"
        elif image_format == ".webp":
            content_type = "image/webp"

        response = Response(response.content)
        response.headers['Content-Type'] = content_type
        response.headers["Cache-Control"] = "max-age=86400"

        return response

    @app.route("/submit", methods=["PUT"])
    def submit():
        data = request.get_json()

        name = request.args.get('name')

        if name == None:
            return Response("No Name Provided", status = 400, content_type = "text/plain")

        image_path = dataset_path.joinpath(f"{name}-image.jpg")
        mask_path = dataset_path.joinpath(f"{name}-mask.png")

        image_path.write_bytes(b64decode(data["image"]))
        image_path.write_bytes(b64decode(data["mask"]))

        dataset.add(name, image_path, mask_path)

        return Response("Entry Successfully Added", content_type="text/plain")

    @app.route("/remove/<name>", methods=["DELETE"])
    def remove(name):
        if dataset.has(name):
            entry = dataset.get(name)

            if entry.image_path.exists():
                entry.image_path.unlink()
            if entry.mask_path.exists():
               entry.mask_path.unlink()

            dataset.remove(name)

            return Response("Entry Successfully Removed", content_type = "text/plain")

        return Response("Entry Not Found", status = 400, content_type = "text/plain")

    @app.route("/check/<name>")
    def check(name):
        return Response("true" if dataset.has(name) else "false", content_type="application/json")

    @app.route("/list", methods=["GET"])
    def list():
        return Response(json.dumps(dataset.list()), content_type="application/json")

    @app.route("/image/<name>")
    def image(name):
        if dataset.has(name):
            entry = dataset.get(name)

            if not entry.exists():
                return Response("Image Not Found", status = 400, content_type = "text/plain")

            image_suffix = entry.image_path.suffix
            content_type = ""

            if image_suffix == ".jpg":
                content_type = "image/jpeg"
            elif image_suffix == ".png":
                content_type = "image/png"

            return Response(entry.image_path.read_bytes(), content_type = content_type)

        return Response("Image Not Found", status = 400, content_type = "text/plain")

    @app.route("/mask/<name>")
    def mask(name):
        if dataset.has(name):
            entry = dataset.get(name)

            if not entry.exists():
                return Response("Image Not Found", status = 400, content_type = "text/plain")

            mask_suffix = entry.mask_path.suffix
            content_type = ""

            if mask_suffix == ".jpg":
                content_type = "image/jpeg"
            elif mask_suffix == ".png":
                content_type = "image/png"

            return Response(entry.mask_path.read_bytes(), content_type = content_type)

        return Response("Mask Not Found", status = 400, content_type = "text/plain")

    app.run(host="0.0.0.0", port=port, debug=True)
