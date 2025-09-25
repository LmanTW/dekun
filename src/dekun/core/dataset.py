from typing import Union, cast
from pathlib import Path

# An entry info.
class Info:

    # Initialize an entry info.
    def __init__(self, provider: str, id: str, page: str, author: str):
        self.provider = provider
        self.id = id
        self.page = page
        self.author = author

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
            parts = path.stem.split("-")
            
            if path.stem[0] != "." and len(parts) == 5:
                id = "-".join(parts[0:4])
                info = Info(parts[0], parts[1], parts[2], parts[3])

                if id not in self.entry_map:
                    self.entry_map[id] = Entry(info, self)
                
                if "image" == parts[4]:
                    self.entry_map[id].image_path = path
                elif "mask" in parts[4]:
                    self.entry_map[id].mask_path = path
                else:
                    raise Exception(f"Unknown image type: {parts[4]} ({path.stem})")

        for id, entry in self.entry_map.items():
            if entry.image_path == None or entry.mask_path == None:
                raise Exception(f"Incomplete dataset entry: {id}")

            self.entry_list.append(id)

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
    def add(self, info: Info, image_path: Path, mask_path: Path):
        id = f"{info.provider}-{info.id}-{info.page}-{info.author}"

        if id not in self.entry_map:
            self.entry_list.append(id)

        self.entry_map[id] = Entry(info, self, image_path, mask_path)

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
    def __init__(self, info: Info, dataset: Dataset, image_path: Union[Path, None] = None, mask_path: Union[Path, None] = None):
        self.info = info
        self.dataset = dataset

        self.image_path = image_path
        self.mask_path = mask_path

    # Check if the entry exists.
    def exists(self):
        return cast(Path, self.image_path).exists() and cast(Path, self.mask_path).exists()

    # Remove the entry.
    def remove(self):
        self.dataset.remove(f"{self.info.provider}-{self.info.id}-{self.info.page}-{self.info.author}")
