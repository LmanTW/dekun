from pathlib import Path
import click

from dekun.inpainter.command import inpainter_command
from dekun.marker.command import marker_command
from dekun.core.editor.main import start_editor

# The root command group.
@click.group()
def root_command():
    pass

# Start the dataset editor.
@click.command("editor")
@click.argument("port", type = click.INT, default = "8080")
@click.option("-d", "--dataset", type = click.Path(True, file_okay = False), required = 1)
def editor_command(port: int, dataset: str):
    start_editor(port, Path(dataset))

root_command.add_command(marker_command)
root_command.add_command(inpainter_command)
root_command.add_command(editor_command)

if __name__ == "__main__":
    root_command()
