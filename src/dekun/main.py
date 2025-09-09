import click

from dekun.generator.command import generator_command
from dekun.marker.command import marker_command

# The root command group.
@click.group()
def root_command():
    pass

root_command.add_command(marker_command)
root_command.add_command(generator_command)

if __name__ == "__main__":
    root_command()
