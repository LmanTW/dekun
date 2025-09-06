from core.utils import format_duration, average_difference
import PIL.Image as Image
from pathlib import Path
from math import ceil
import click
import torch

from marker.editor.main import start_editor
from marker.dataset import Dataset
from marker.model import Marker

# The marker command group.
@click.group("marker")
def marker_command():
    pass

# Initialize a marker.
@click.command("init")
@click.argument("path", type=click.Path())
@click.option("-w", "--width", type=click.INT, default=512)
@click.option("-h", "--height", type=click.INT, default=512)
@click.option("-d", "--depth", type=click.INT, default=4)
def init_command(path: str, width: int, height: int, depth: int):
    processed_path = Path(path).with_suffix(".pth")

    if processed_path.exists():
        raise Exception(f"The file already exists: {str(processed_path)}")

    Marker("cpu", width, height, depth).save(processed_path)

# Get the info of a marker.
@click.command("info")
@click.argument("path", type=click.Path(True))
def info_command(path: str):
    data = torch.load(str(Path(path).with_suffix(".pth")), "cpu")

    print(f"Width: {data['width']}")
    print(f"Height: {data['height']}")
    print(f"Depth: {data['depth']}")
    print(f"Loss: {data['loss']}")
    print(f"Iterations: {data['iterations']}")

# Mark an image.
@click.command("mark")
@click.argument("path", type=click.Path(True))
@click.option("-i", "--image", type=click.Path(True, dir_okay=False), required=1)
@click.option("-o", "--output", type=click.Path(False, dir_okay=False), default="output.png")
@click.option("-D", "--device", type=click.Choice(["auto", "cpu", "cuda"]), default="auto")
def mark_command(path: str, image: str, output: str, device: str):
    marker = Marker.load(device, Path(path).with_suffix(".pth"))

    output_image = marker.mark(Image.open(Path(image)).convert("RGB"))
    output_image = (torch.sigmoid(output_image) * 255).byte().cpu().numpy()
    output_image = Image.fromarray(output_image)

    output_image.save(output)

# Train a marker.
@click.command("train")
@click.argument("path", type=click.Path(True))
@click.option("-d", "--dataset", type=click.Path(True, file_okay=False), required=1)
@click.option("-i", "--iterations", type=click.INT)
@click.option("-t", "--threshold", type=click.FLOAT)
@click.option("-D", "--device", type=click.Choice(["auto", "cpu", "cuda"]), default="auto")
def train_command(path: str, dataset: str, iterations: int, threshold: float, device: str):
    marker = Marker.load(device, Path(path).with_suffix(".pth"))

    duration_history = []
    loss_history = []

    def callback(iteration, loss, duration):
        duration_history.append(duration)
        loss_history.append(loss)

        if len(duration_history) > 10:
            del duration_history[0]

        if len(loss_history) > 3:
            del loss_history[0]

        if iterations != None:
            parts = [
                f"Iteration: {iteration}",
                f"Loss: {loss:.5f}",
                f"Duration: {format_duration(duration)}",
                f"Estimate: {format_duration((iterations - iteration) * (sum(duration_history) / len(duration_history)))}"
            ]

            print(" | ".join(f"{part: <20}" for part in parts))

            if iteration < iterations:
                return True

        if threshold != None:
            estimate = ceil((loss - threshold) / average_difference(loss_history)) * (sum(duration_history) / len(duration_history)) if len(loss_history) > 1 else 0

            parts = [
                f"Iteration: {iteration}",
                f"Loss: {loss:.5f}",
                f"Duration: {format_duration(duration)}",
                f"Estimate: {format_duration(estimate) if len(loss_history) > 1 and estimate >= 0 else 'unknown'}"
            ]

            print(" | ".join(f"{part: <20}" for part in parts))

            if loss > threshold:
                return True

        return False

    if (iterations == None or marker.iterations >= iterations) and (threshold == None or marker.loss <= threshold):
        parts = [
            f"Iteration: {marker.iterations}",
            f"Loss: {marker.loss:.5f}",
        ]

        print(" | ".join(f"{part: <20}" for part in parts))
    else:
        marker.train(Dataset(Path(dataset)), callback)
        marker.save(Path(path))

# Start the marker dataset editor.
@click.command("editor")
@click.argument("path", type=click.Path(True))
def editor_command(path: str):
    start_editor(Path(path))

marker_command.add_command(init_command)
marker_command.add_command(info_command)
marker_command.add_command(mark_command)
marker_command.add_command(train_command)
marker_command.add_command(editor_command)
