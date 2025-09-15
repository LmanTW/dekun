from typing import Union, cast
from pathlib import Path

# A dataset for training.
class Dataset():

    # Initialize a dataset.
    def __init__(self, directory: Path, sort: str = "name"):
        self.directory = directory
        self.sort = sort

        self.load()

    # Load the dataset.
    def load(self):
        if not self.directory.exists():
            raise Exception(f"The path does not exists: {str(self.directory)}")
        if not self.directory.is_dir():
            raise Exception(f"The path is not a directory: {str(self.directory)}")

        self.entry_map = {}
        self.entry_list = []

        for path in self.directory.iterdir():
            if "-image" in path.stem:
                name = path.stem.replace("-image", "", 1)

                if name not in self.entry_map:
                    self.entry_map[name] = Entry(name, self)

                self.entry_map[name].image_path = path
            elif "-mask" in path.stem:
                name = path.stem.replace("-mask", "", 1)

                if name not in self.entry_map:
                    self.entry_map[name] = Entry(name, self)

                self.entry_map[name].mask_path = path

        for name, entry in self.entry_map.items():
            if entry.image_path == None or entry.mask_path == None:
                raise Exception(f"Incomplete dataset entry: {name}")

            self.entry_list.append(name)

        if self.sort == "name":
            self.entry_list = sorted(self.entry_list)
        elif self.sort == "date":
            self.entry_list.sort(key=lambda name: -self.entry_map[name].image_path.stat().st_ctime)
        elif self.sort == "size":
            self.entry_list.sort(key=lambda name: -self.entry_map[name].image_path.stat().st_size)
        else:
            raise ValueError(f"Unsupported sort type: {self.sort} (name|date|size)")

    # Check if an entry exists.
    def has(self, name: str):
        return name in self.entry_map

    # Get an entry.
    def get(self, name: str):
        if (name not in self.entry_map):
            raise Exception(f"Entry not found: {name}")

        return self.entry_map[name]

    # Get the size of the dataset.
    def size(self):
        return len(self.entry_list)

    # List the entries.
    def list(self):
        return self.entry_list

    # Add an entry.
    def add(self, name: str, image_path: Path, mask_path: Path):
        if name not in self.entry_map:
            self.entry_list.append(name)

        self.entry_map[name] = Entry(name, self, image_path, mask_path)

        if self.sort == "name":
            self.entry_list = sorted(self.entry_list)
        elif self.sort == "date":
            self.entry_list.sort(key=lambda name: -self.entry_map[name].image_path.stat().st_ctime)
        elif self.sort == "size":
            self.entry_list.sort(key=lambda name: -self.entry_map[name].image_path.stat().st_size)
        else:
            raise ValueError(f"Unsupported sort type: {self.sort} (name|date|size)")

    # Remove an entry.
    def remove(self, name: str):
        if (name not in self.entry_map):
            raise Exception(f"Entry not found: {name}") 

        del self.entry_map[name]
        self.entry_list.remove(name)

# A dataset entry.
class Entry:

    # Initialize an entry
    def __init__(self, name: str, dataset: Dataset, image_path: Union[None, Path] = None, mask_path: Union[None, Path] = None):
        self.name = name
        self.dataset = dataset

        self.image_path = image_path
        self.mask_path = mask_path

    # Check if the entry exists.
    def exists(self):
        return cast(Path, self.image_path).exists() and cast(Path, self.mask_path).exists()

    # Remove the entry.
    def remove(self):
        self.dataset.remove(self.name)
