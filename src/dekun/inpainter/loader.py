from typing import Callable
from pathlib import Path
from shutil import rmtree
import PIL.Image as pil
import tempfile
import torch
import gc

from dekun.core.utils import transform_image, fit_tensor 
from dekun.core.dataset import Dataset, Entry

COLORS = [
    (1.0, 1.0, 1.0),
    (0.5, 0.5, 0.5),
    (0, 0, 0)
]

# Apply a mask onto an image.
def apply_mask(index: int, image: torch.Tensor, mask: torch.Tensor):
    if len(image.shape) != 3:
        raise ValueError("Unsupported image tensor shape: {image.shape}")
    if len(mask.shape) != 3:
        raise ValueError("Unsupported mask tensor shape: {mask.shape}")

    binary_mask = (mask > 0.5).expand_as(image)
    color_tensor = torch.tensor(COLORS[index % len(COLORS)], dtype=image.dtype, device=image.device).view(3, 1, 1).expand_as(image)

    combined = image.clone()
    combined[binary_mask] = color_tensor[binary_mask]

    return combined

# Load an entry.
def load_entry(index: int, entry: Entry, width: int, height: int, device: torch.device):
    with pil.open(str(entry.image_path)) as image:
        image_tensor = fit_tensor(transform_image(image, "RGB").to(device), width, height)[0]

    with pil.open(str(entry.mask_path)) as mask:
        mask_tensor = fit_tensor(transform_image(mask, "L").to(device), width, height)[0]

    return image_tensor.unsqueeze(0), mask_tensor.unsqueeze(0), apply_mask(index, image_tensor, mask_tensor).unsqueeze(0)

# A inpainter dataset loader.
class Loader(object):

    # Initialize a inpainter dataset loader.
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
                    index = (self.chunks * 100) + len(chunk)
                    chunk.append(load_entry(index, self.entries[index], self.width, self.height, self.device))

                torch.save(chunk, str(self.temporary.joinpath(f"chunk-{self.chunks + 1}.pth")))
                gc.collect()

                if (self.chunks * 100) + len(chunk) >= len(self.entries):
                    break

                self.chunks += 1

        elif cache == "memory":
            self.processed_entries = []

            for index, entry in enumerate(self.entries):
                self.processed_entries.append(load_entry(index, entry, self.width, self.height, self.device))

        elif cache != "none":
            raise ValueError(f"Unsupported cache type: {cache}")

    # Enter the dataset loader.
    def __enter__(self):
        return self

    # Exit the dataset loader.
    def __exit__(self, *_):
        if self.cache == "disk":
            rmtree(str(self.temporary))

        gc.collect()

    # Loop through the dataset.
    def loop(self, callback: Callable[[torch.Tensor, torch.Tensor, torch.Tensor], None]):
        if self.cache == "none":
            for index, entry in enumerate(self.entries):
                callback(*load_entry(index, entry, self.width, self.height, self.device))
        elif self.cache == "disk":
            for i in range(0, self.chunks):
                for entry in torch.load(str(self.temporary.joinpath(f"chunk-{i + 1}.pth")), self.device):
                    callback(entry[0], entry[1], entry[2])

                gc.collect()
        elif self.cache == "memory":
            for entry in self.processed_entries:
                callback(entry[0], entry[1], entry[2])
