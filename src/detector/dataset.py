import PIL.Image as Image
from pathlib import Path

# A dataset to train the detector.
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

        return image, mask

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
