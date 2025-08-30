import click

from detector.command import detector_command

# The root command group.
@click.group()
def root_command():
    pass

root_command.add_command(detector_command)

if __name__ == "__main__":
    root_command()
