from typing import Union, Callable, cast
from pathlib import Path
import PIL.Image as pil
import torch
import time

from dekun.core.utils import resolve_device, transform_image, fit_tensor 
from dekun.core.dataset import Dataset
from dekun.marker.loader import Loader
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
        if width < 1:
            raise ValueError(f"Invalid width: {width}")
        if height < 1:
            raise ValueError(f"Invalid height: {height}")

        self.device = torch.device(resolve_device(device))
        self.model = UNet(3, 1, 4).to(self.device)

        self.width = width
        self.height = height

        self.loss = 1.0
        self.iterations = 0

        self.criterion = torch.nn.BCEWithLogitsLoss()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr = 1e-4)

    # Train the marker.
    def train(self, dataset: Dataset, cache: str = "none", callback: Union[Callable[[int, float, int], bool], None] = None):
        self.model.train()

        with Loader(dataset, self.width, self.height, cache, self.device) as loader:
            while True:
                start = time.time()
                average = []

                def train_callback(image: torch.Tensor, mask: torch.Tensor):
                    prediction = self.model(image)
                    loss = self.criterion(prediction, mask)

                    self.optimizer.zero_grad()
                    loss.backward()
                    self.optimizer.step()

                    average.append(loss.item())

                loader.loop(train_callback)

                self.loss = sum(average) / len(average)
                self.iterations += 1

                if callback == None or not callback(self.iterations, self.loss, round(time.time() - start)):
                    break

    # Mark an image.
    def mark(self, image: Union[torch.Tensor, pil.Image]):
        self.model.eval()

        with torch.no_grad():
            image_tensor = cast(torch.Tensor, image if isinstance(image, torch.Tensor) else transform_image(image))
            resized_tensor, transform = fit_tensor(image_tensor, self.width, self.height)

            output = self.model(resized_tensor.to(self.device).unsqueeze(0))
            output = output[:, :, transform[1]:transform[1] + transform[3], transform[0]:transform[0] + transform[2]]
            output = torch.nn.functional.interpolate(output, size=(image_tensor.shape[1], image_tensor.shape[2])).squeeze(0).squeeze()

            return torch.sigmoid(output)

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
