from pathlib import Path
import click

from dekun.generator.command import generator_command
from dekun.marker.command import marker_command
from dekun.core.editor.main import start_editor

# The root command group.
@click.group()
def root_command():
    pass

# Start the dataset editor.
@click.command("editor")
@click.argument("path", type=click.Path(True))
def editor_command(path: str):
    start_editor(Path(path))

root_command.add_command(marker_command)
root_command.add_command(generator_command)
root_command.add_command(editor_command)

if __name__ == "__main__":
    root_command()
