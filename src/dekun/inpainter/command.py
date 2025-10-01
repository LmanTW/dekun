from pathlib import Path
import PIL.Image as pil
from math import ceil
import click
import torch
import numpy

from dekun.core.utils import LoadProgress, TrainProgress, format_duration, average_difference
from dekun.inpainter.model import Inpainter
from dekun.core.dataset import Dataset

# The inpainter command group.
@click.group("inpainter")
def inpainter_command():
    pass

# Initialize a inpainter.
@click.command("init")
@click.argument("path", type=click.Path())
@click.option("-w", "--width", type=click.INT, default=512)
@click.option("-h", "--height", type=click.INT, default=512)
def init_command(path: str, width: int, height: int):
    processed_path=Path(path).with_suffix(".pth")

    if processed_path.exists():
        raise Exception(f"The file already exists: {str(processed_path)}")

    Inpainter("cpu", width, height).save(processed_path)

# Get the info of a inpainter.
@click.command("info")
@click.argument("path", type=click.Path(True))
def info_command(path: str):
    data=torch.load(str(Path(path)), "cpu")

    print(f"Width: {data['width']}")
    print(f"Height: {data['height']}")
    print(f"Loss: {data['loss']}")
    print(f"Iterations: {data['iterations']}")

# Inpaint an image.
@click.command("inpaint")
@click.argument("path", type=click.Path(True))
@click.option("-i", "--image", type=click.Path(True, dir_okay=False), required=1)
@click.option("-m", "--mask", type=click.Path(True, dir_okay=False), required=1)
@click.option("-o", "--output", type=click.Path(False, dir_okay=False), default="output.jpg")
@click.option("-D", "--device", type=click.Choice(["auto", "cpu", "cuda"]), default="auto")
def inpaint_command(path: str, image: str, mask: str, output: str, device: str):
    inpainter = Inpainter.load(device, Path(path))

    output_image = inpainter.inpaint(pil.open(Path(image)), pil.open(Path(mask)))
    output_image = (output_image - output_image.min()) / (output_image.max() - output_image.min())
    output_image = (output_image * 255).byte().cpu().numpy()
    output_image = numpy.transpose(output_image, (1, 2, 0))
    output_image = pil.fromarray(output_image.astype(numpy.uint8))

    output_image.save(output)

# Train a generator.
@click.command("train")
@click.argument("path", type=click.Path(True))
@click.option("-d", "--dataset", type=click.Path(True, file_okay=False), required=1)
@click.option("-i", "--iterations", type=click.INT)
@click.option("-t", "--threshold", type=click.FLOAT)
@click.option("-C", "--cache", type=click.Choice(["none", "disk", "memory"]), default="none")
@click.option("-D", "--device", type=click.Choice(["auto", "cpu", "cuda"]), default="auto")
def train_command(path: str, dataset: str, iterations: int, threshold: float, cache: str, device: str):
    inpainter = Inpainter.load(device, Path(path))

    duration_history = []
    loss_history = []

    # The loading callback.
    def load_callback(progress: LoadProgress):
        parts = [
            f"Loading Dataset ({cache})",
            f"Loaded: {progress.loaded}",
            f"Total: {progress.total}"
        ]

        print(" | ".join(f"{part: <20}" for part in parts))

    # The training callback.
    def train_callback(progress: TrainProgress):
        duration_history.append(progress.duration)
        loss_history.append(progress.loss)

        if len(duration_history) > 10:
            del duration_history[0]

        if len(loss_history) > 3:
            del loss_history[0]

        if iterations != None:
            parts = [
                f"Training Model ({inpainter.width}x{inpainter.height})",
                f"Iteration: {progress.iteration}",
                f"Loss: {progress.loss:.5f}",
                f"Duration: {format_duration(progress.duration)}",
                f"Estimate: {format_duration((iterations - progress.iteration) * (sum(duration_history) / len(duration_history)))}"
            ]

            print(" | ".join(f"{part: <20}" for part in parts))

            if progress.iteration < iterations:
                return True

        if threshold != None:
            estimate = ceil((progress.loss - threshold) / average_difference(loss_history)) * (sum(duration_history) / len(duration_history)) if len(loss_history) > 1 else 0

            parts = [
                f"Training Model ({inpainter.width}x{inpainter.height})",
                f"Iteration: {progress.iteration}",
                f"Loss: {progress.loss:.5f}",
                f"Duration: {format_duration(progress.duration)}",
                f"Estimate: {format_duration(estimate) if len(loss_history) > 1 and estimate >= 0 else 'unknown'}"
            ]

            print(" | ".join(f"{part: <20}" for part in parts))

            if progress.loss > threshold:
                return True

        return False

    if (iterations == None or inpainter.iterations >= iterations) and (threshold == None or inpainter.loss <= threshold):
        parts = [
            f"Model Info ({inpainter.width}x{inpainter.height})",
            f"Iteration: {inpainter.iterations}",
            f"Loss: {inpainter.loss:.5f}"
        ]

        print("Info     |" + " | ".join(f"{part: <20}" for part in parts))
    else:
        inpainter.train(Dataset(Path(dataset)), cache, load_callback, train_callback)
        inpainter.save(Path(path))

inpainter_command.add_command(init_command)
inpainter_command.add_command(info_command)
inpainter_command.add_command(inpaint_command)
inpainter_command.add_command(train_command)
