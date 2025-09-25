import torch.nn as nn
import torch

# The convolutional block.
class ConvolutionalBlock(nn.Module):

    # Initialize a convolutional block.
    def __init__(self, in_channels: int, out_channels: int):
        super(ConvolutionalBlock, self).__init__()

        if in_channels < 1:
            raise ValueError(f"Invalid input channels: {in_channels}")
        if out_channels < 1:
            raise ValueError(f"Invalid output channels: {out_channels}")

        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    # Forward the convolutional block.
    def forward(self, x):
        return self.block(x)

# The attention block.

class AttentionBlock(nn.Module):
    def __init__(self, gating_channels: int, input_channels: int, intermediate_channels: int):
        super(AttentionBlock, self).__init__()

        self.gating_transform = nn.Sequential(
            nn.Conv2d(gating_channels, intermediate_channels, kernel_size=1, stride=1, padding=0, bias=True),
            nn.BatchNorm2d(intermediate_channels)
        )

        self.input_transform = nn.Sequential(
            nn.Conv2d(input_channels, intermediate_channels, kernel_size=1, stride=1, padding=0, bias=True),
            nn.BatchNorm2d(intermediate_channels)
        )

        self.attention_coefficients = nn.Sequential(
            nn.Conv2d(intermediate_channels, 1, kernel_size=1, stride=1, padding=0, bias=True),
            nn.BatchNorm2d(1),
            nn.Sigmoid()
        )

        self.relu = nn.ReLU(inplace=True)

    def forward(self, gating_signal, input_features):
        transformed_gating = self.gating_transform(gating_signal)
        transformed_input = self.input_transform(input_features)

        attention_map = self.relu(transformed_gating + transformed_input)
        attention_weights = self.attention_coefficients(attention_map)
        output = input_features * attention_weights

        return output


# The U-Net.
class UNet(nn.Module):

    # Initialize a U-Net.
    def __init__(self, in_channels: int, out_channels: int, depth: int = 4):
        super(UNet, self).__init__()

        if in_channels < 1:
            raise ValueError(f"Invalid input channels: {in_channels}")
        if out_channels < 1:
            raise ValueError(f"Invalid output channels: {out_channels}")
        if depth < 1:
            raise ValueError(f"Invalid depth: {depth}")

        self.encoders = nn.ModuleList()
        self.pools = nn.ModuleList()

        for layer in range(1, depth + 1):
            self.encoders.append(ConvolutionalBlock(in_channels, 2 ** (layer + 5)))
            self.pools.append(nn.MaxPool2d(kernel_size=2, stride=2))
            in_channels = 2 ** (layer + 5)

        self.decoders = nn.ModuleList()
        self.decoder_blocks = nn.ModuleList()
        self.attention_blocks = nn.ModuleList()
        self.bottleneck = ConvolutionalBlock(in_channels, in_channels * 2)

        in_channels = (2 ** (depth + 5)) * 2

        for layer in reversed(range(1, depth + 1)):
            channels = 2 ** (layer + 5)

            self.decoders.append(nn.ConvTranspose2d(in_channels, channels, kernel_size=2, stride=2))
            self.attention_blocks.append(AttentionBlock(g_channels=channels, x_channels=channels, inter_channels=channels // 2))
            self.decoder_blocks.append(ConvolutionalBlock(channels * 2, channels))

            in_channels = channels

        self.final_convolution = nn.Conv2d(in_channels, out_channels, kernel_size=1)

    # Forward the detector.
    def forward(self, tensor: torch.Tensor):
        skip_connections = []

        for encoder, pool in zip(self.encoders, self.pools):
            tensor = encoder(tensor)
            skip_connections.append(tensor)
            tensor = pool(tensor)

        tensor = self.bottleneck(tensor)
        skip_connections = skip_connections[::-1]

        for decoder, attention_block, decoder_block, skip in zip(self.decoders, self.attention_blocks, self.decoder_blocks, skip_connections):
            tensor = decoder(tensor)

            if tensor.shape != skip.shape:
                tensor = nn.functional.interpolate(tensor, size=skip.shape[2:])

            skip = attention_block(tensor, skip)
            tensor = torch.cat((skip, tensor), dim=1)
            tensor = decoder_block(tensor)

        return self.final_convolution(tensor)
