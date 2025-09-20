from typing import Union, Callable, cast
from pathlib import Path
import PIL.Image as pil
import numpy as numpy
import torch
import time

from dekun.core.utils import resolve_device, transform_image, fit_tensor
from dekun.inpainter.loader import Loader
from dekun.core.dataset import Dataset
from dekun.core.unet import UNet

# An inpainter to generator a certain parts of an image.
class Inpainter:

    # Load a inpainter.
    @staticmethod
    def load(device: str, path: Path):
        data = torch.load(str(path), resolve_device(device))
        inpainter = Inpainter(device, data["width"], data["height"])

        inpainter.model.load_state_dict(data["model_state"])
        inpainter.optimizer.load_state_dict(data["optimizer_state"])

        inpainter.loss = data["loss"]
        inpainter.iterations = data["iterations"]

        return inpainter

    # Initialize a inpainter.
    def __init__(self, device: str, width: int, height: int):
        if width < 1:
            raise ValueError(f"Invalid width: {width}")
        if height < 1:
            raise ValueError(f"Invalid height: {height}")

        self.device = torch.device(resolve_device(device))
        self.model = UNet(4, 3, 4).to(self.device)

        self.width = width
        self.height = height

        self.loss = 1.0
        self.iterations = 0

        self.criterion = torch.nn.MSELoss()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr = 1e-4)

    # Train the inpainter.
    def train(self, dataset: Dataset, cache: str = "none", callback: Union[Callable[[int, float, int], bool], None] = None):
        self.model.train()

        with Loader(dataset, self.width, self.height, cache, self.device) as loader:
            while True:
                start = time.time()
                average = []

                def train_callback(image: torch.Tensor, mask: torch.Tensor, combined: torch.Tensor):
                    prediction = self.model(torch.cat((combined, mask), dim=1))
                    loss = self.criterion(prediction, image)

                    self.optimizer.zero_grad()
                    loss.backward()
                    self.optimizer.step()

                    average.append(loss.item())
                
                loader.loop(train_callback)

                self.loss = sum(average) / len(average)
                self.iterations += 1

                if callback == None or not callback(self.iterations, self.loss, round(time.time() - start)):
                    break

    # Inpaint an image.
    def inpaint(self, image: Union[torch.Tensor, pil.Image], mask: Union[torch.Tensor, pil.Image]):
        self.model.eval()

        with torch.no_grad():
            image_tensor = cast(torch.Tensor, image if isinstance(image, torch.Tensor) else transform_image(image.convert("RGB")))
            mask_tensor = cast(torch.Tensor, mask if isinstance(mask, torch.Tensor) else transform_image(mask.convert("L")))

            resized_image, transform = fit_tensor(image_tensor, self.width, self.height)
            resized_mask = fit_tensor(mask_tensor, self.width, self.height)[0]

            binary_mask = (resized_mask > 0.5).float()

            output = self.model(torch.cat((resized_image.unsqueeze(0), resized_mask.unsqueeze(0)), dim=1))
            output = (output - output.min()) / (output.max() - output.min())
            output = (resized_image * (1 - binary_mask)) + (output * binary_mask)
            output = output[:, :, transform[1]:transform[1] + transform[3], transform[0]:transform[0] + transform[2]]
            output = torch.nn.functional.interpolate(output, size=(image_tensor.shape[1], image_tensor.shape[2])).squeeze(0)

            return output

    # Save the inpainter.
    def save(self, path: Path):
        torch.save({
            "width": self.width,
            "height": self.height,

            "loss": self.loss,
            "iterations": self.iterations,

            "model_state": self.model.state_dict(),
            "optimizer_state": self.optimizer.state_dict()
        }, str(path))
