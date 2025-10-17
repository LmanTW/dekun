from typing import cast
import PIL.Image as pil
import torch

from dekun.core.utils import transform_image, fit_tensor
from dekun.core.dataset import Dataset

# A marker dataset loader.
class Loader(torch.utils.data.Dataset):

    # Initialize a marker dataset loader.
    def __init__(self, dataset: Dataset, width: int, height: int):
        self.entries = []

        for name in dataset.list():
            entry = dataset.get(name)

            if entry.exists():
                self.entries.append(entry)

        self.width = width
        self.height = height

    # Get the size of the dataset.
    def __len__(self):
        return len(self.entries)

    # Get an entry.
    def __getitem__(self, index: int):
        entry = self.entries[index]

        with pil.open(str(entry.image_path)) as image:
            image_tensor = fit_tensor(cast(torch.Tensor, transform_image(image.convert("RGB"))), self.width, self.height)[0]

        with pil.open(str(entry.mask_path)) as mask:
            mask_tensor = fit_tensor(cast(torch.Tensor, transform_image(mask.convert("L"))), self.width, self.height)[0]

        return image_tensor, mask_tensor
