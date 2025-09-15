import PIL.Image as pil
from pathlib import Path
from math import ceil
import click
import torch
import numpy

from dekun.core.utils import format_duration, average_difference
from dekun.inpainter.model import Inpainter
from dekun.core.dataset import Dataset

# The inpainter command group.
@click.group("inpainter")
def inpainter_command():
    pass

# Initialize a inpainter.
@click.command("init")
@click.argument("path", type = click.Path())
@click.option("-w", "--width", type = click.INT, default = 512)
@click.option("-h", "--height", type = click.INT, default = 512)
def init_command(path: str, width: int, height: int):
    processed_path = Path(path).with_suffix(".pth")

    if processed_path.exists():
        raise Exception(f"The file already exists: {str(processed_path)}")

    Inpainter("cpu", width, height).save(processed_path)

# Get the info of a inpainter.
@click.command("info")
@click.argument("path", type = click.Path(True))
def info_command(path: str):
    data = torch.load(str(Path(path).with_suffix(".pth")), "cpu")

    print(f"Width: {data['width']}")
    print(f"Height: {data['height']}")
    print(f"Loss: {data['loss']}")
    print(f"Iterations: {data['iterations']}")

# Inpaint an image.
@click.command("inpaint")
@click.argument("path", type = click.Path(True))
@click.option("-i", "--image", type = click.Path(True, dir_okay = False), required = 1)
@click.option("-m", "--mask", type = click.Path(True, dir_okay = False), required = 1)
@click.option("-o", "--output", type = click.Path(False, dir_okay = False), default = "output.jpg")
@click.option("-D", "--device", type = click.Choice(["auto", "cpu", "cuda"]), default = "auto")
def inpaint_command(path: str, image: str, mask: str, output: str, device: str):
    inpainter = Inpainter.load(device, Path(path).with_suffix(".pth"))

    output_image = inpainter.inpaint(pil.open(Path(image)), pil.open(Path(mask)))
    output_image = (output_image - output_image.min()) / (output_image.max() - output_image.min())
    output_image = (output_image * 255).byte().cpu().numpy()
    output_image = numpy.transpose(output_image, (1, 2, 0))
    output_image = pil.fromarray(output_image.astype(numpy.uint8))

    output_image.save(output)


# Train a generator.
@click.command("train")
@click.argument("path", type = click.Path(True))
@click.option("-d", "--dataset", type = click.Path(True, file_okay=False), required = 1)
@click.option("-i", "--iterations", type = click.INT)
@click.option("-t", "--threshold", type = click.FLOAT)
@click.option("-c", "--cache", type = click.Choice(["none", "disk", "memory"]), default = "none")
@click.option("-D", "--device", type = click.Choice(["auto", "cpu", "cuda"]), default = "auto")
def train_command(path: str, dataset: str, iterations: int, threshold: float, cache: str, device: str):
    inpainter = Inpainter.load(device, Path(path).with_suffix(".pth"))

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

    if (iterations == None or inpainter.iterations >= iterations) and (threshold == None or inpainter.loss <= threshold):
        parts = [
            f"Iteration: {inpainter.iterations}",
            f"Loss: {inpainter.loss:.5f}"
        ]

        print(" | ".join(f"{part: <20}" for part in parts))
    else:
        inpainter.train(Dataset(Path(dataset)), cache, callback)
        inpainter.save(Path(path))

inpainter_command.add_command(init_command)
inpainter_command.add_command(info_command)
inpainter_command.add_command(inpaint_command)
inpainter_command.add_command(train_command)
