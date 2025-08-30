import torchvision.transforms as transform
from typing import Union, Callable, cast
from pathlib import Path
import PIL.Image as pil
import torch
import time

from core.utils import resolve_device
from detector.dataset import Dataset
from core.unet import UNet

transform_image = transform.Compose([
    transform.ToTensor(),
    transform.Normalize(mean = [0.5] * 3, std = [0.5] * 3)
])

transform_mask = transform.Compose([
    transform.ToTensor()
])

# Fit an image into a specified size.
def fit_image(image: pil.Image, width: int, height: int):
    container_aspect = width / height
    image_aspect = image.size[0] / image.size[1]

    new_width = 0
    new_height = 0

    if image_aspect > container_aspect:
        new_width = width
        new_height = round(width / image_aspect)
    else:
        new_width = round(height * image_aspect)
        new_height = height

    image = image.resize((new_width, new_height))
    offset_x = (width - new_width) // 2
    offset_y = (height - new_height) // 2

    new_image = pil.new(image.mode, (width, height), tuple([0] * len(image.mode)))
    new_image.paste(image, (offset_x, offset_y))

    return new_image, (offset_x, offset_y, new_width, new_height)

# A detector to detect the censored parts of an image.
class Detector:

    # Load a detector.
    @staticmethod
    def load(device: str, path: Path):
        data = torch.load(str(path), resolve_device(device))

        detector = Detector(device, data["width"], data["height"], data["depth"])
        detector.model.load_state_dict(data["model_state"])
        detector.optimizer.load_state_dict(data["optimizer_state"])

        return detector

    # Initialize a detector.
    def __init__(self, device: str, width: int, height: int, depth: int = 4):
        if depth < 1:
            raise Exception("The depth must be equal or larger than 1")

        self.device = torch.device(resolve_device(device))
        self.model = UNet(3, 1, depth).to(self.device)

        self.width = width
        self.height = height
        self.depth = depth

        self.criterion = torch.nn.BCEWithLogitsLoss()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr = 1e-4)

    # Train the detector.
    def train(self, dataset: Dataset, batch_size: int = 4, callback: Union[Callable[[int, int, int], bool], None] = None):
        if batch_size < 1:
            raise Exception("The batch size must be equal or larger than 1")

        self.model.train()

        iteration = 1
        start = time.time()

        while True:
            loss_value = 1

            for image, mask in dataset:
                image_tensor = cast(torch.Tensor, transform_image(fit_image(image, self.width, self.height)[0]))
                mask_tensor = cast(torch.Tensor, transform_mask(fit_image(mask, self.width, self.height)[0]))

                predictions = self.model(image_tensor.unsqueeze(0).to(self.device))
                loss = self.criterion(predictions, mask_tensor.unsqueeze(0).to(self.device))

                self.optimizer.zero_grad()
                loss.backward()
                self.optimizer.step()

                loss_value = loss.item()

            if callback == None:
                break
            else:
                if not callback(iteration, loss_value, round(time.time() - start)):
                    break

            iteration += 1
            start = time.time()

    # Detect the censored parts of an image.
    def detect(self, image: pil.Image):
        transformed_image, transform = transform_image(fit_image(image, self.width, self.height))

        output = self.model(cast(torch.Tensor, transformed_image).unsqueeze(0).squeeze(0).to(self.device))
        output = output[transform[1]:transform[1] + transform[3], transform[0]:transform[0] + transform[2]]
        output = torch.nn.functional.interpolate(output.unsqueeze(0).unsqueeze(0), size=(image.height, image.width))

        return output

    # Save the detector.
    def save(self, path: Path):
        torch.save({
            "width": self.width,
            "height": self.height,
            "depth": self.depth,

            "model_state": self.model.state_dict(),
            "optimizer_state": self.optimizer.state_dict()
        }, str(path))
