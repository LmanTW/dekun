from typing import Union, Callable, Optional 
from pathlib import Path
import torch.nn as nn
import torch
import time

from dekun.core.utils import LoadProgress, TrainProgress, resolve_device, transform_image, fit_tensor
from dekun.core.lama import LaMaGenerator, PatchDiscriminator
from dekun.inpainter.loader import Loader
from dekun.core.dataset import Dataset

# An inpainter to generator a certain parts of an image.
class Inpainter:

    # Load a inpainter.
    @staticmethod
    def load(device: str, path: Path):
        data = torch.load(str(path), resolve_device(device))
        inpainter = Inpainter(device, data["width"], data["height"])

        inpainter.generator.load_state_dict(data["generator_state"])
        inpainter.discriminator.load_state_dict(data["discriminator_state"])

        inpainter.generator_optimizer.load_state_dict(data["generator_optimizer_state"])
        inpainter.discriminator_optimizer.load_state_dict(data["discriminator_optimizer_state"])

        inpainter.loss = data["loss"]
        inpainter.iterations = data["iterations"]

        return inpainter

    # Initialize a inpainter.
    def __init__(self, device: str, width: int, height: int):
        if width < 1:
            raise ValueError(f"Invalid width: {width}")
        if height < 1:
            raise ValueError(f"Invalid height: {height}")

        self.width = width
        self.height = height

        self.loss = 1.0
        self.iterations = 0

        self.device = torch.device(resolve_device(device))
        self.generator = LaMaGenerator(inp_channels=4, out_channels=3).to(self.device)
        self.discriminator = PatchDiscriminator(in_channels=3).to(self.device)

        self.generator_optimizer = torch.optim.Adam(self.generator.parameters(), lr=1e-4, betas=(0.5, 0.999))
        self.discriminator_optimizer = torch.optim.Adam(self.discriminator.parameters(), lr=1e-4, betas=(0.5, 0.999))

        self.l1 = nn.L1Loss()

    # Train the inpainter.
    def train(self, dataset: Dataset, cache: str = "none", load_callback: Union[Callable[[LoadProgress], None], None] = None, train_callback: Union[Callable[[TrainProgress], bool], None] = None):
        self.generator.train()
        self.discriminator.train()

        with Loader(dataset, self.width, self.height, cache, self.device, load_callback) as loader:
            while True:
                start = time.time()
                average = []

                def train_step(combined: torch.Tensor, mask: torch.Tensor):
                    masked_img = combined * (1 - mask)
                    generator_input = torch.cat([masked_img, mask], dim=1)

                    prediction = self.generator(generator_input)
                    composite = (prediction * mask) + (combined * (1 - mask))

                    self.discriminator_optimizer.zero_grad()
                    real_output = self.discriminator(combined)
                    fake_output = self.discriminator(composite.detach())
                    discriminator_loss = torch.mean(nn.functional.relu(1.0 - real_output)) + torch.mean(nn.functional.relu(1.0 + fake_output))
                    discriminator_loss.backward()
                    self.discriminator_optimizer.step()

                    self.generator_optimizer.zero_grad()
                    fake_output = self.discriminator(composite)
                    adversarial_loss = -torch.mean(fake_output)
                    reconstruction_loss = self.reconstruction_loss(prediction, combined, mask)
                    perceptual_loss = torch.tensor(0.0, device=self.device) # ?
                    generator_loss = reconstruction_loss * 1.0 + adversarial_loss * 0.1 + perceptual_loss * 0.1
                    generator_loss.backward()
                    self.generator_optimizer.step()

                    average.append(generator_loss.item())
                
                loader.loop(train_step)

                self.loss = sum(average) / len(average)
                self.iterations += 1

                if train_callback == None or not train_callback(TrainProgress(self.iterations, self.loss, round(time.time() - start))):
                    break

    # Calculate the reconstruction loss.
    def reconstruction_loss(self, prediction: torch.Tensor, target, mask: Optional[torch.Tensor] = None):
        if mask is None:
            return self.l1(prediction, target)
        else:
            return self.l1(prediction * mask, target * mask)

    # Save the inpainter.
    def save(self, path: Path):
        torch.save({
            "width": self.width,
            "height": self.height,

            "loss": self.loss,
            "iterations": self.iterations,

            "generator_state": self.generator.state_dict(),
            "discriminator_state": self.discriminator.state_dict(),

            "generator_optimizer_state": self.generator_optimizer.state_dict(),
            "discriminator_optimizer_state": self.discriminator_optimizer.state_dict()
        }, str(path))
