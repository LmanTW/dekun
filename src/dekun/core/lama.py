from typing import cast, List
import torch.nn as nn
import torch

# A 2D convolutional block.
class ConvolutionalBlock(nn.Module):

    # Initialize a 2D convolutional block.
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 3, stride: int = 1, padding: int = 1, normalize: int = True, activation = "relu"):
        super(ConvolutionalBlock, self).__init__()

        layers = []
        layers.append(nn.Conv2d(in_channels, out_channels, kernel_size, stride, padding))

        if normalize:
            layers.append(nn.BatchNorm2d(out_channels))

        if activation is not None:
            if activation == 'relu':
                layers.append(nn.ReLU(inplace=True))
            elif activation == 'leakyrelu':
                layers.append(nn.LeakyReLU(0.2, inplace=True))
        elif activation == 'elu':
            layers.append(nn.ELU(inplace=True))

        self.block = nn.Sequential(*layers)

    # Forward the convolutional block.
    def forward(self, input: torch.Tensor):
        return self.block(input)

# A fourier unit layer.
class FourierUnit(nn.Module):
 
    # Initialize a fourier unit layer.
    def __init__(self, in_channels: int, out_channels: int, spectral_normalization: bool = False):
        super(FourierUnit, self).__init__()

        self.convolutional = nn.Sequential(
            nn.Conv2d(in_channels * 2, out_channels * 2, kernel_size=1, stride=1, padding=0),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels * 2, out_channels * 2, kernel_size=1, stride=1, padding=0),
        )

        if spectral_normalization:
            for layer in self.convolutional:
                if isinstance(layer, nn.Conv2d):
                    nn.utils.spectral_norm(layer)

    # Forward the fourier unit layer.
    def forward(self, input: torch.Tensor):
        fft = torch.fft.rfft2(input, norm="ortho")
        combined = torch.cat([fft.real, fft.imag], dim=1)
        processed = self.convolutional(combined)

        half_channels = processed.shape[1] // 2
        real_processed, imaginary_processed = processed[:, :half_channels], processed[:, half_channels:]
        fft_processed = torch.complex(real_processed, imaginary_processed)

        return torch.fft.irfft2(fft_processed, s=(input.shape[2], input.shape[3]), norm="ortho")

# A fast fourier convolution layer.
class FastFourierConvolution(nn.Module):

    # Initialize a fast fourier convolutional layer.
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 3, global_in_ratio: float = 0.5, global_out_ratio: float = 0.5, spectral_normalization: bool = False):
        super(FastFourierConvolution, self).__init__()

        self.in_channels = in_channels
        self.out_channels = out_channels
        self.global_in_ratio = global_in_ratio
        self.global_out_ratio = global_out_ratio

        in_global = int(in_channels * global_in_ratio)
        in_local = in_channels - in_global
        out_global = int(out_channels * global_out_ratio)
        out_local = out_channels - out_global

        self.local_to_local_convolution = nn.Conv2d(in_local, out_local, kernel_size, padding=kernel_size // 2)
        self.local_to_global_convolution = nn.Conv2d(in_local, out_global, kernel_size=1)
        self.global_to_local_convolution = nn.Conv2d(in_global, out_local, kernel_size=1)
        self.fourier = FourierUnit(in_global, out_global, spectral_normalization)

        self.normalize = nn.BatchNorm2d(out_channels)
        self.act = nn.ReLU(inplace=True)

    # Forward the fast fourier convolution layer.
    def forward(self, input: torch.Tensor):
        global_input = int(self.in_channels * self.global_in_ratio)

        if global_input == 0:
            local_input = input
            global_input = None
        elif global_input == self.in_channels:
            local_input = None
            global_input = input
        else:
            local_input = input[:, :self.in_channels - global_input]
            global_input = input[:, self.in_channels - global_input:]

        local_output = None
        global_output = None

        if local_input is not None:
            local_output = self.local_to_local_convolution(local_input)
            global_output = self.local_to_global_convolution(local_input)

        if global_input is not None:
            global_to_local = self.global_to_local_convolution(global_input)
            fourier_global = self.fourier(global_input)

            local_output = local_output + global_to_local
            global_output = global_output + fourier_global

        output = torch.cat(cast(List[torch.Tensor], [local_output, global_output]), dim=1)
        output = self.normalize(output)

        return self.act(output)

# Residual fast fourier convolution block.
class FastFourierConvolutionResidualBlock(nn.Module):

    # Initialize a residual fast fourier convolution block.
    def __init__(self, channels: int, global_ratio: float= 0.5):
        super(FastFourierConvolutionResidualBlock, self).__init__()

        self.fast_fourier_convolution = FastFourierConvolution(channels, channels, global_in_ratio=global_ratio, global_out_ratio=global_ratio)
        self.convolutional = nn.Conv2d(channels, channels, kernel_size=3, padding=1)
        self.normalize = nn.BatchNorm2d(channels)
        self.act = nn.ReLU(inplace=True)

    # Foward the residual fast fourier convolution block.
    def forward(self, input: torch.Tensor):
        output = self.fast_fourier_convolution(input)
        output = self.convolutional(output)
        output = self.normalize(output)

        return self.act(output + input)

# A LaMa generator.
class LaMaGenerator(nn.Module):

    # Initialize a LaMa generator.
    def __init__(self, inp_channels: int = 4, out_channels: int = 3, mid_channels: int =64, down_amount: int = 4, residual_amount: int = 8, global_ratio: float = 0.5):
        super(LaMaGenerator, self).__init__()

        self.input_convolution = nn.Sequential(
            nn.Conv2d(inp_channels, mid_channels, kernel_size=7, padding=3),
            nn.BatchNorm2d(mid_channels),
            nn.ReLU(inplace=True)
        )

        encoder_layers = []
        channels = mid_channels

        for _ in range(down_amount):
            encoder_layers.append(nn.Conv2d(channels, channels * 2, kernel_size=4, stride=2, padding=1))
            encoder_layers.append(nn.BatchNorm2d(channels * 2))
            encoder_layers.append(nn.ReLU(inplace=True))
            channels *= 2

        residual_blocks = []

        for _ in range(residual_amount):
            residual_blocks.append(FastFourierConvolutionResidualBlock(channels, global_ratio=global_ratio))

        decoder_layers = []

        for _ in range(down_amount):
            decoder_layers.append(nn.ConvTranspose2d(channels, channels // 2, kernel_size=4, stride=2, padding=1))
            decoder_layers.append(nn.BatchNorm2d(channels // 2))
            decoder_layers.append(nn.ReLU(inplace=True))
            channels //= 2

        self.encoder = nn.Sequential(*encoder_layers)
        self.bottleneck = nn.Sequential(*residual_blocks)
        self.decoder = nn.Sequential(*decoder_layers)

        self.output_convolution = nn.Sequential(
            nn.Conv2d(mid_channels, out_channels, kernel_size=7, padding=3),
            nn.Tanh()
        )

    # Forward the LaMa generator.
    def forward(self, input: torch.Tensor):
        input = self.input_convolution(input)

        encoded = self.encoder(input)
        bottlenecked = self.bottleneck(encoded)
        decoded = self.decoder(bottlenecked)

        # Map from [-1,1] to [0,1] if needed outside.

        return self.output_convolution(decoded)

# A patch discriminator.
class PatchDiscriminator(nn.Module):

    # Initialize a patch discriminator.
    def __init__(self, in_channels: int = 3, base_channels: int = 64, n_layers: int =4):
        super(PatchDiscriminator, self).__init__()

        channels = base_channels

        layers = []
        layers.append(nn.Conv2d(in_channels, channels, kernel_size=4, stride=2, padding=1))
        layers.append(nn.LeakyReLU(0.2, inplace=True))

        for _ in range(1, n_layers):
            layers.append(nn.Conv2d(channels, channels * 2, kernel_size=4, stride=2, padding=1))
            layers.append(nn.BatchNorm2d(channels * 2))
            layers.append(nn.LeakyReLU(0.2, inplace=True))
            channels *= 2

        layers.append(nn.Conv2d(channels, 1, kernel_size=4, padding=1))
        self.model = nn.Sequential(*layers)

    # Forward the patch discriminator.
    def forward(self, input: torch.Tensor):
        return self.model(input)
