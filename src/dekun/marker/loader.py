from typing import Callable
from pathlib import Path
import PIL.Image as pil
import tempfile
import shutil
import torch

from dekun.core.utils import transform_image, fit_tensor 
from dekun.core.dataset import Dataset, Entry

# Load an entry.
def load_entry(entry: Entry, width: int, height: int, device: torch.device):
    with pil.open(str(entry.image_path)) as image:
        image_tensor = fit_tensor(transform_image(image, "RGB").to(device), width, height)[0].unsqueeze(0)

    with pil.open(str(entry.mask_path)) as mask:
        mask_tensor = fit_tensor(transform_image(mask, "L").to(device), width, height)[0].unsqueeze(0)

    return image_tensor, mask_tensor

# A marker dataset loader.
class Loader(object):

    # Initialize a marker dataset loader.
    def __init__(self, dataset: Dataset, width: int, height: int, cache: str, device: torch.device):
        self.dataset = dataset
        self.entries = []

        self.width = width
        self.height = height

        self.cache = cache
        self.device = device

        for name in dataset.list():
            entry = dataset.get(name)

            if entry.exists():
                self.entries.append(entry)

        if cache == "disk":
            self.temporary = Path(tempfile.mkdtemp())
            self.chunks = 0

            while True:
                chunk = []

                while (len(chunk) < 100) and (self.chunks * 100) + len(chunk) < len(self.entries): 
                    chunk.append(load_entry(self.entries[(self.chunks * 100) + len(chunk)], self.width, self.height, self.device))

                torch.save(chunk, str(self.temporary.joinpath(f"chunk-{self.chunks + 1}.pth")))

                if (self.chunks * 100) + len(chunk) >= len(self.entries):
                    break

                self.chunks += 1

                del chunk
        elif cache == "memory":
            self.processed_entries = []

            for name in dataset.list():
                entry = dataset.get(name)

                if entry.exists():
                    self.processed_entries.append(load_entry(entry, self.width, self.height, self.device))
        elif cache != "none":
            raise ValueError(f"Unsupported cache type: {cache}")

    # Enter the dataset loader.
    def __enter__(self):
        return self

    # Exit the dataset loader.
    def __exit__(self, exc_type, exc_value, exc_traceback):
        if self.cache == "disk":
            shutil.rmtree(str(self.temporary))

    # Loop through the dataset.
    def loop(self, callback: Callable[[torch.Tensor, torch.Tensor], None]):
        if self.cache == "none":
            for entry in self.entries:
                callback(*load_entry(entry, self.width, self.height, self.device))
        elif self.cache == "disk":
            for i in range(0, self.chunks):
                for entry in torch.load(str(self.temporary.joinpath(f"chunk-{i + 1}.pth")), self.device):
                    callback(entry[0], entry[1])
        elif self.cache == "memory":
            for entry in self.processed_entries:
                callback(entry[0], entry[1])
