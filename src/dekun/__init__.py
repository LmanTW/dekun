from typing import Union
from pathlib import Path
import click

from dekun.core.playground.main import start_playground
from dekun.inpainter.command import inpainter_command
from dekun.marker.command import marker_command
from dekun.core.editor.main import start_editor
from dekun.inpainter.model import Inpainter
from dekun.marker.model import Marker 

# The root command group.
@click.group()
def root_command():
    pass

# Start the dataset editor.
@click.command("editor")
@click.argument("port", type=click.INT, default=8080)
@click.option("-d", "--dataset", type=click.Path(True, file_okay=False), required=1)
def editor_command(port: int, dataset: str):
    start_editor(port, Path(dataset))

# Start the model playground.
@click.command("playground")
@click.argument("port", type=click.INT, default=8080)
@click.option("-m", "--marker", type=click.Path(True, dir_okay=False))
@click.option("-i", "--inpainter", type=click.Path(True, dir_okay=False))
@click.option("-D", "--device", type=click.Choice(["auto", "cpu", "cuda"]), default="auto")
def playground_command(port: int, marker: Union[str, None], inpainter: Union[str, None], device: str): 
    start_playground(
        port,
        
        None if marker == None else Marker.load(device, Path(marker)),
        None if inpainter == None else Inpainter.load(device, Path(inpainter))
    )

root_command.add_command(marker_command)
root_command.add_command(inpainter_command)
root_command.add_command(editor_command)
root_command.add_command(playground_command)

if __name__ == "__main__":
    root_command()
