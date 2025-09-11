from typing import Union, Callable, cast
from pathlib import Path
import PIL.Image as pil
import torch
import time

from dekun.core.utils import resolve_device, fit_image, transform_image, transform_mask
from dekun.core.dataset import Dataset
from dekun.core.unet import UNet

# A marker to mark a certain parts of an image.
class Marker:

    # Load a marker.
    @staticmethod
    def load(device: str, path: Path):
        data = torch.load(str(path), resolve_device(device))
        marker = Marker(device, data["width"], data["height"])

        marker.model.load_state_dict(data["model_state"])
        marker.optimizer.load_state_dict(data["optimizer_state"])

        marker.loss = data["loss"]
        marker.iterations = data["iterations"]

        return marker

    # Initialize a marker.
    def __init__(self, device: str, width: int, height: int):
        self.device = torch.device(resolve_device(device))
        self.model = UNet(3, 1, 4).to(self.device)

        self.width = width
        self.height = height

        self.loss = 1
        self.iterations = 0

        self.criterion = torch.nn.BCEWithLogitsLoss()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr = 1e-4)

    # Train the marker.
    def train(self, dataset: Dataset, callback: Union[Callable[[int, int, int], bool], None] = None):
        self.model.train()

        while True:
            start = time.time()

            for image, mask in dataset:
                image_tensor = cast(torch.Tensor, transform_image(fit_image(image, self.width, self.height)[0]))
                mask_tensor = cast(torch.Tensor, transform_mask(fit_image(mask, self.width, self.height)[0]))

                prediction = self.model(image_tensor.unsqueeze(0).to(self.device))
                loss = self.criterion(prediction, mask_tensor.unsqueeze(0))

                self.optimizer.zero_grad()
                loss.backward()
                self.optimizer.step()
                self.loss = loss.item()

            self.iterations += 1

            if callback == None:
                break
            else:
                if not callback(self.iterations, self.loss, round(time.time() - start)):
                    break

    # Mark an image.
    def mark(self, image: pil.Image):
        self.model.eval()

        with torch.no_grad():
            resized_image, transform = fit_image(image, self.width, self.height)

            output = self.model(cast(torch.Tensor, transform_image(resized_image)).unsqueeze(0).to(self.device))
            output = output[:, :, transform[1]:transform[1] + transform[3], transform[0]:transform[0] + transform[2]]
            output = torch.nn.functional.interpolate(output, size=(image.height, image.width)).squeeze(0).squeeze(0)

        return output

    # Save the marker.
    def save(self, path: Path):
        torch.save({
            "width": self.width,
            "height": self.height,

            "loss": self.loss,
            "iterations": self.iterations,

            "model_state": self.model.state_dict(),
            "optimizer_state": self.optimizer.state_dict()
        }, str(path))
