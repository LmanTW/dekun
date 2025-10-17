from typing import Union, Callable, cast
from pathlib import Path
import PIL.Image as pil
import torch
import time

from dekun.core.utils import DummyContext, TrainProgress, resolve_device, transform_image, fit_tensor
from dekun.core.dataset import Dataset
from dekun.marker.loader import Loader
from dekun.core.unet import UNet

# A marker to mark a certain parts of an image.
class Marker:

    # Load a marker.
    @staticmethod
    def load(device: str, path: Path):
        data = torch.load(str(path), resolve_device(device))
        marker = Marker(device, data["width"], data["height"], data["depth"])

        marker.model.load_state_dict(data["model_state"])
        marker.optimizer.load_state_dict(data["optimizer_state"])

        marker.loss = data["loss"]
        marker.iterations = data["iterations"]

        return marker

    # Initialize a marker.
    def __init__(self, device: str, width: int, height: int, depth: int = 5):
        if width < 1:
            raise ValueError(f"Invalid width: {width}")
        if height < 1:
            raise ValueError(f"Invalid height: {height}")

        self.device = torch.device(resolve_device(device))
        self.model = UNet(3, 1, depth).to(self.device)

        self.width = width
        self.height = height
        self.depth = depth

        self.loss = 1.0
        self.iterations = 0

        self.criterion = torch.nn.BCEWithLogitsLoss()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr = 1e-4)

    # Train the marker.
    def train(self, dataset: Dataset, callback: Union[Callable[[TrainProgress], bool], None] = None):
        self.model.train()

        loader = torch.utils.data.DataLoader(
            Loader(dataset, self.width, self.height),

            batch_size=4,
            num_workers=4,
            prefetch_factor=2,

            pin_memory=self.device.type == "cuda",
        )

        while True:
            start = time.time()
            average = []

            for images, masks in loader:
                self.optimizer.zero_grad()

                images = images.to(self.device, non_blocking=True)
                masks = masks.to(self.device, non_blocking=True)
                
                with torch.autocast(self.device.type) if self.device.type == "cuda" else DummyContext():
                    predictions = self.model(images)
                    loss = self.criterion(predictions, masks)

                    self.optimizer.zero_grad()
                    loss.backward()
                    self.optimizer.step()

                    average.append(loss.item())

            self.loss = sum(average) / len(average)
            self.iterations += 1

            if callback == None or not callback(TrainProgress(self.iterations, self.loss, round(time.time() - start))):
                break

    # Mark an image.
    def mark(self, image: Union[torch.Tensor, pil.Image]):
        self.model.eval()

        with torch.no_grad():
            image_tensor = cast(torch.Tensor, image if isinstance(image, torch.Tensor) else transform_image(image.convert("RGB")))
            resized_tensor, transform = fit_tensor(image_tensor, self.width, self.height)

            output = self.model(resized_tensor.unsqueeze(0))
            output = output[:, :, transform[1]:transform[1] + transform[3], transform[0]:transform[0] + transform[2]]
            output = torch.nn.functional.interpolate(output, size=(image_tensor.shape[1], image_tensor.shape[2])).squeeze(0).squeeze()

            return torch.sigmoid(output)

    # Save the marker.
    def save(self, path: Path):
        torch.save({
            "width": self.width,
            "height": self.height,
            "depth": self.depth,

            "loss": self.loss,
            "iterations": self.iterations,

            "model_state": self.model.state_dict(),
            "optimizer_state": self.optimizer.state_dict()
        }, str(path))
