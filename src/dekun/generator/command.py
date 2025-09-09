from pathlib import Path
import click
import torch

from dekun.generator.model import Generator
from dekun.generator.dataset import Dataset

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


