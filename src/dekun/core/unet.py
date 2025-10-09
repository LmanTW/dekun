from typing import List
import torch.nn as nn
import torch

# A double convolutional block.
class DoubleConvolutionalBlock(nn.Module):

    # Initialize a double convolutional block.
    def __init__(self, in_channels: int, out_channels: int):
        super(DoubleConvolutionalBlock, self).__init__()

        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, input: torch.Tensor):
        return self.block(input)

# A standard U-Net.
class UNet(nn.Module):

    # Initialize a U-Net.
    def __init__(self, in_channels: int, out_channels: int, features: List[int] = [64, 128, 256, 512]):
        super(UNet, self).__init__()

        if in_channels < 1:
            raise ValueError(f"Invalid input channels: {in_channels}")
        if out_channels < 1:
            raise ValueError(f"Invalid output channels: {out_channels}")
        if len(features) < 1:
            raise ValueError(f"Not enough features: {len(features)}")

        self.downs = nn.ModuleList()
        self.ups = nn.ModuleList()
        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)

        for feature in features:
            self.downs.append(DoubleConvolutionalBlock(in_channels, feature))
            in_channels = feature

        self.bottleneck = DoubleConvolutionalBlock(features[-1], features[-1] * 2)

        for feature in reversed(features):
            self.ups.append(nn.ConvTranspose2d(feature * 2, feature, kernel_size=2, stride=2))
            self.ups.append(DoubleConvolutionalBlock(feature * 2, feature))

        self.final_convolution = nn.Conv2d(features[0], out_channels, kernel_size=1)

    # Forward the U-Net. 
    def forward(self, input: torch.Tensor):
        skip_connections = []

        for down in self.downs:
            input = down(input)
            skip_connections.append(input)
            input = self.pool(input)

        input = self.bottleneck(input)
        skip_connections = skip_connections[::-1]

        for index in range(0, len(self.ups), 2):
            input = self.ups[index](input)
            skip_connection = skip_connections[index // 2]

            if input.shape != skip_connection.shape:
                input = nn.functional.interpolate(input, size=skip_connection.shape[2:])

            concat_skip = torch.cat((skip_connection, input), dim=1)
            input = self.ups[index + 1](concat_skip)

        return self.final_convolution(input)
