from requests import request as send_request
from flask import Flask, Response, request
from base64 import b64decode
from pathlib import Path
import json

from dekun.marker.dataset import Dataset 

def start_editor(dataset_path: Path):
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

        page_format = Path(page).suffix
        content_type = ""

        if page_format == ".jpg":
            content_type = "image/jpeg"
        elif page_format == ".png":
            content_type = "image/png"
        elif page_format == ".webp":
            content_type = "image/webp"

        response = Response(response.content)
        response.headers['Content-Type'] = content_type
        response.headers["Cache-Control"] = "max-age=86400"

        return response

    @app.route("/drivers/pixiv.js")
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

        page_format = Path(page).suffix
        content_type = ""

        if page_format == ".jpg":
            content_type = "image/jpeg"
        elif page_format == ".png":
            content_type = "image/png"
        elif page_format == ".webp":
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
            return Response("false", content_type="application/json")

        dataset_path.joinpath(f"{name}-image.jpg").write_bytes(b64decode(data["image"]))
        dataset_path.joinpath(f"{name}-mask.png").write_bytes(b64decode(data["mask"]))

        dataset.add(name, ".jpg", ".png")

        return Response("true", content_type="application/json")

    @app.route("/remove/<name>", methods=["DELETE"])
    def remove(name):
        if dataset.has(name):
            dataset_path.joinpath(f"{name}-image{dataset.image_map[name]['image']}").unlink()
            dataset_path.joinpath(f"{name}-mask{dataset.image_map[name]['mask']}").unlink()

            dataset.remove(name)

            return Response("true", content_type="application/json")

        return Response("false", content_type="application/json")

    @app.route("/list")
    def list():
        return Response(json.dumps(dataset.image_list), content_type="application/json")

    @app.route("/image/<name>")
    def image(name):
        image_format = dataset.image_map[name]["image"]
        content_type = ""

        if image_format == ".jpg":
            content_type = "image/jpeg"
        elif image_format == ".png":
            content_type = "image/png"
        elif image_format == ".webp":
            content_type = "image/webp"

        return Response(dataset_path.joinpath(f"{name}-image{dataset.image_map[name]['image']}").read_bytes(), content_type=content_type)

    @app.route("/mask/<name>")
    def mask(name):
        mask_format = dataset.image_map[name]["mask"]
        content_type = ""

        if mask_format == ".jpg":
            content_type = "image/jpeg"
        elif mask_format == ".png":
            content_type = "image/png"
        elif mask_format == ".webp":
            content_type = "image/webp"

        return Response(dataset_path.joinpath(f"{name}-mask{dataset.image_map[name]['mask']}").read_bytes(), content_type=content_type)

    app.run(host="0.0.0.0", port=8080, debug=True)
