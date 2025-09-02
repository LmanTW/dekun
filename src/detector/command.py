from core.utils import format_duration, average_difference
import PIL.Image as Image
from pathlib import Path
from math import ceil
import click
import torch

from detector.editor.main import start_editor
from detector.dataset import Dataset
from detector.model import Detector

# The detector command group.
@click.group("detector")
def detector_command():
    pass

# Initialize a detector.
@click.command("init")
@click.argument("path", type=click.Path())
@click.option("-w", "--width", type=click.INT, default=512)
@click.option("-h", "--height", type=click.INT, default=512)
@click.option("-d", "--depth", type=click.INT, default=4)
def init_command(path: str, width: int, height: int, depth: int):
    processed_path = Path(path).with_suffix(".pth")

    if processed_path.exists():
        raise Exception(f"The file already exists: {str(processed_path)}")

    Detector("cpu", width, height, depth).save(processed_path)

# Get the info of a detector.
@click.command("info")
@click.argument("path", type=click.Path(True))
def info_command(path: str):
    data = torch.load(str(Path(path).with_suffix(".pth")), "cpu")

    print(f"Width: {data['width']}")
    print(f"Height: {data['height']}")
    print(f"Depth: {data['depth']}")
    print(f"Loss: {data['loss']}")
    print(f"Iterations: {data['iterations']}")

# Train a detector.
@click.command("train")
@click.argument("path", type=click.Path(True))
@click.option("-d", "--dataset", type=click.Path(True, file_okay=False), required=1)
@click.option("-i", "--iterations", type=click.INT)
@click.option("-t", "--threshold", type=click.FLOAT)
@click.option("-D", "--device", type=click.Choice(["auto", "cpu", "cuda"]), default="auto")
def train_command(path: str, dataset: str, iterations: int, threshold: float, device: str):
    detector = Detector.load(device, Path(path).with_suffix(".pth"))

    duration_history = []
    loss_history = []

    def callback(iteration, loss, duration):
        duration_history.append(duration)
        loss_history.append(loss)

        if len(duration_history) > 10:
            del duration_history[0]

        if len(loss_history) > 3:
            del loss_history[0]

        if iterations != None and iteration < iterations:
            parts = [
                f"Iteration: {iteration}",
                f"Loss: {loss:.5f}",
                f"Duration: {format_duration(duration)}",
                f"Estimate: {format_duration((iterations - iteration) * (sum(duration_history) / len(duration_history)))}"
            ]

            print(" | ".join(f"{part: <20}" for part in parts))

            return True

        if threshold != None and loss > threshold:
            estimate = ceil((loss - threshold) / average_difference(loss_history)) * (sum(duration_history) / len(duration_history)) if len(loss_history) > 1 else 0

            parts = [
                f"Iteration: {iteration}",
                f"Loss: {loss:.5f}",
                f"Duration: {format_duration(duration)}",
                f"Estimate: {format_duration(estimate) if len(loss_history) > 1 and estimate >= 0 else 'unknown'}"
            ]

            print(" | ".join(f"{part: <20}" for part in parts))

            return True

        return False

    if (iterations != None and detector.iterations >= iterations) or (threshold != None and detector.loss <= threshold):
        parts = [
            f"Iteration: {detector.iterations}",
            f"Loss: {detector.loss:.5f}",
        ]

        print(" | ".join(f"{part: <20}" for part in parts))
    else:
        detector.train(Dataset(Path(dataset)), callback)
        detector.save(Path(path))

# Detect the censored parts of an image.
@click.command("detect")
@click.argument("path", type=click.Path(True))
@click.option("-i", "--image", type=click.Path(True, dir_okay=False), required=1)
@click.option("-o", "--output", type=click.Path(False, dir_okay=False), default="output.png")
@click.option("-D", "--device", type=click.Choice(["auto", "cpu", "cuda"]), default="auto")
def detect_command(path: str, image: str, output: str, device: str):
    detector = Detector.load(device, Path(path).with_suffix(".pth"))

    output_image = detector.detect(Image.open(Path(image)).convert("RGB"))
    output_image = (torch.sigmoid(output_image) * 255).byte().cpu().numpy()
    output_image = Image.fromarray(output_image)

    output_image.save(output)

# Start the detector dataset editor.
@click.command("dataset")
@click.argument("path", type=click.Path(True))
def dataset_command(path: str):
    start_editor(Path(path))

detector_command.add_command(init_command)
detector_command.add_command(info_command)
detector_command.add_command(train_command)
detector_command.add_command(detect_command)
detector_command.add_command(dataset_command)
