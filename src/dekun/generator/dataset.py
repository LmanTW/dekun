import PIL.Image as Image
from pathlib import Path
import numpy

COLORS = [
    (255, 255, 255),
    (125, 125, 125),
    (0, 0, 0)
]

# A dataset to train the generator.
class Dataset():

    # Initialize a dataset.
    def __init__(self, directory: Path):
        self.directory = directory

        self.load()

    # Get the size of the dataset.
    def __len__(self):
        return len(self.image_list)

    # Get an entry in the dataset as two images.
    def __getitem__(self, index):
        name = self.image_list[index]

        image = Image.open(self.directory.joinpath(f"{name}-image{self.image_map[name]['image']}")).convert("RGB")
        mask = Image.open(self.directory.joinpath(f"{name}-mask{self.image_map[name]['mask']}")).convert("L")

        image_array = numpy.array(image)
        binary_mask = numpy.array(mask) > 0

        color = COLORS[len(COLORS) % index]

        colored_mask = numpy.zeros_like(image_array)
        colored_mask[:, :, 0] = color[0]
        colored_mask[:, :, 1] = color[1]
        colored_mask[:, :, 2] = color[2]

        combined = numpy.copy(image_array)
        combined[binary_mask] = colored_mask[binary_mask]

        return image, mask, Image.fromarray(combined)

    # Load the dataset.
    def load(self):
        self.image_map = {}
        self.image_list = []

        for path in self.directory.iterdir():
            if "-image" in path.stem:
                name = path.stem.replace("-image", "", 1)

                if name not in self.image_map:
                    self.image_map[name] = {}

                self.image_map[name]["image"] = path.suffix
            elif "-mask" in path.stem:
                name = path.stem.replace("-mask", "", 1)

                if name not in self.image_map:
                    self.image_map[name] = {}

                self.image_map[name]["mask"] = path.suffix

        for key, value in self.image_map.items():
            if "image" not in value or "mask" not in value:
                raise Exception(f"Incomplete dataset entry: {key}")

            self.image_list.append(key)

        self.image_list.sort(key=lambda name: -self.directory.joinpath(f"{name}-image{self.image_map[name]['image']}").stat().st_ctime)

    # Check if an entry exists.
    def has(self, name: str):
        return name in self.image_map

    # Add an entry.
    def add(self, name: str, image_suffix: str, mask_suffix: str):
        if name not in self.image_map:
            self.image_list.append(name)

        self.image_map[name] = {
            "image": image_suffix,
            "mask": mask_suffix
        }

        self.image_list.sort(key=lambda name: -self.directory.joinpath(f"{name}-image{self.image_map[name]['image']}").stat().st_ctime)

    # Remove an entry.
    def remove(self, name: str):
        if name in self.image_map:
            self.image_list.remove(name)
            del self.image_map[name]
