from typing import Union, Callable, Optional
from pathlib import Path
import torch.nn as nn
import torch
import time
import os

from dekun.core.lama import LaMaGenerator, PatchDiscriminator, VGGFeatureExtractor
from dekun.core.utils import TrainProgress, resolve_device, fit_tensor
from dekun.inpainter.loader import Loader
from dekun.core.dataset import Dataset

CPU_CORES = os.cpu_count()
WORKER_AMOUNT = 1 if CPU_CORES == None else CPU_CORES // 2

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
        self.vgg = VGGFeatureExtractor().to(self.device).eval()

    # Train the inpainter.
    def train(self, dataset: Dataset, train_callback: Union[Callable[[TrainProgress], bool], None] = None):
        self.generator.train()
        self.discriminator.train()

        loader = torch.utils.data.DataLoader(
            Loader(dataset, self.width, self.height),

            batch_size=4,
            num_workers=WORKER_AMOUNT,
            prefetch_factor=2,

            pin_memory=self.device.type == "cuda"
        )

        while True:
            start = time.time()
            average = []

            for images, masks, combineds in loader:
                self.discriminator_optimizer.zero_grad()
                self.generator_optimizer.zero_grad()

                images = images.to(self.device, non_blocking=True)
                masks = masks.to(self.device, non_blocking=True)
                combineds = combineds.to(self.device, non_blocking=True)
                
                prediction = self.generator(torch.cat([combineds, masks], dim=1))
                composite = (prediction * masks) + (combineds * (1 - masks))

                real_output = self.discriminator(images)
                fake_output = self.discriminator(composite.detach())
                discriminator_loss = torch.mean(nn.functional.relu(1.0 - real_output)) + torch.mean(nn.functional.relu(1.0 + fake_output))
                discriminator_loss.backward()
                self.discriminator_optimizer.step() 

                fake_output = self.discriminator(composite)
                adversarial_loss = -torch.mean(fake_output)
                reconstruction_loss = self.reconstruction_loss(prediction, images, masks)
                perceptual_loss = self.perceptual_loss(prediction * masks + images * (1 - masks), images)
                generator_loss = reconstruction_loss * 1.0 + adversarial_loss * 0.1 + perceptual_loss * 0.1
                generator_loss.backward()
                self.generator_optimizer.step()

                average.append(generator_loss.item())

            self.loss = sum(average) / len(average)
            self.iterations += 1

            if train_callback == None or not train_callback(TrainProgress(self.iterations, self.loss, round(time.time() - start))):
                break

    # Inpaint an image.
    def inpaint(self, image: torch.Tensor, mask: torch.Tensor):
        self.generator.eval()

        with torch.no_grad():
            resized_image, transform = fit_tensor(image, self.width, self.height)
            resized_mask = fit_tensor(mask, self.width, self.height)[0]
 
            output = self.generator(torch.cat((resized_image.unsqueeze(0), resized_mask.unsqueeze(0)), dim=1))
            output = torch.clamp(output, 0.0, 1.0)

            binary_mask = (resized_mask > 0.5).float()

            output = (resized_image * (1 - binary_mask)) + (output * binary_mask)
            output = output[:, :, transform[1]:transform[1] + transform[3], transform[0]:transform[0] + transform[2]]
            output = torch.nn.functional.interpolate(output, size=(image.shape[1], image.shape[2])).squeeze(0)

            return output.squeeze(0)

    # Calculate the reconstruction loss.
    def reconstruction_loss(self, prediction: torch.Tensor, target, mask: Optional[torch.Tensor] = None):
        if mask is None:
            return self.l1(prediction, target)
        else:
            return self.l1(prediction * mask, target * mask)

    # Calculate the perceptual loss.
    def perceptual_loss(self, prediction: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        mean = torch.tensor([0.485, 0.456, 0.406], device=self.device).view(1, 3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225], device=self.device).view(1, 3, 1, 1)

        prediction_normal = (prediction - mean) / std
        target_normal = (target - mean) / std

        prediction_features = self.vgg(prediction_normal)
        target_features = self.vgg(target_normal)

        return self.l1(prediction_features, target_features)

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
