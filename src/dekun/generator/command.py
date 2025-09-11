import PIL.Image as Image
from pathlib import Path
from math import ceil
import click
import torch

from dekun.core.utils import format_duration, average_difference
from dekun.generator.model import Generator
from dekun.core.dataset import Dataset

# The generator command group.
@click.group("generator")
def generator_command():
    pass

# Initialize a generator.
@click.command("init")
@click.argument("path", type=click.Path())
@click.option("-w", "--width", type=click.INT, default=512)
@click.option("-h", "--height", type=click.INT, default=512)
def init_command(path: str, width: int, height: int):
    processed_path = Path(path).with_suffix(".pth")

    if processed_path.exists():
        raise Exception(f"The file already exists: {str(processed_path)}")

    Generator("cpu", width, height).save(processed_path)

# Get the info of a generator.
@click.command("info")
@click.argument("path", type=click.Path(True))
def info_command(path: str):
    data = torch.load(str(Path(path).with_suffix(".pth")), "cpu")

    print(f"Width: {data['width']}")
    print(f"Height: {data['height']}")
    print(f"Loss: {data['loss']}")
    print(f"Iterations: {data['iterations']}")

# Train a generator.
@click.command("train")
@click.argument("path", type=click.Path(True))
@click.option("-d", "--dataset", type=click.Path(True, file_okay=False), required=1)
@click.option("-i", "--iterations", type=click.INT)
@click.option("-t", "--threshold", type=click.FLOAT)
@click.option("-D", "--device", type=click.Choice(["auto", "cpu", "cuda"]), default="auto")
def train_command(path: str, dataset: str, iterations: int, threshold: float, device: str):
    marker = Generator.load(device, Path(path).with_suffix(".pth"))

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

generator_command.add_command(init_command)
generator_command.add_command(info_command)
generator_command.add_command(train_command)
