from typing import cast
import PIL.Image as pil
import torch

from dekun.core.utils import transform_image, fit_tensor
from dekun.core.dataset import Dataset

# Apply a mask onto an image.
def apply_mask(image: torch.Tensor, mask: torch.Tensor):
    if len(image.shape) != 3:
        raise ValueError("Unsupported image tensor shape: {image.shape}")
    if len(mask.shape) != 3:
        raise ValueError("Unsupported mask tensor shape: {mask.shape}")

    binary_mask = (mask > 0.5).expand_as(image)
    color_tensor = torch.tensor((0, 0, 0), dtype=image.dtype, device=image.device).view(3, 1, 1).expand_as(image)

    combined = image.clone()
    combined[binary_mask] = color_tensor[binary_mask]

    return combined

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
            image_tensor = fit_tensor(cast(torch.Tensor, transform_image(image.convert('RGB'))), self.width, self.height)[0]

        with pil.open(str(entry.mask_path)) as mask:
            mask_tensor = fit_tensor(cast(torch.Tensor, transform_image(mask.convert('L'))), self.width, self.height)[0]

        return image_tensor, mask_tensor, apply_mask(image_tensor, mask_tensor)
