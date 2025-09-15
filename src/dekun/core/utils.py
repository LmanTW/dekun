import torchvision.transforms as transform
import PIL.Image as pil
from typing import cast
import torch

# Resolve a device.
def resolve_device(device):
    if device == "auto":
        if torch.cuda.is_available():
            return "cuda"
        else:
            return "cpu"
    elif device == "cpu":
        return "cpu"
    elif device == "cuda":
        if not torch.cuda.is_available():
            raise Exception("Cuda is not available")

        return "cuda"
    else:
        raise ValueError(f"Unsupported device: {device}")

# Transform an image to a tensor.
def transform_image(image: pil.Image, mode: str):
    image = image.convert(mode)

    if mode == "RGB":
        pipeline = transform.Compose([
            transform.ToTensor(),
            # transform.Normalize(mean = [0.5, 0.5, 0.5], std = [0.5, 0.5, 0.5])
        ])
    elif mode == "L":
        pipeline = transform.Compose([transform.ToTensor()])
    else:
        raise ValueError(f"Unsupported mode: {mode}")

    return cast(torch.Tensor, pipeline(image))

# Fit a tensor into a specified size.
def fit_tensor(tensor: torch.Tensor, width: int, height: int):
    if len(tensor.shape) != 3:
        raise ValueError(f"Unsupported tensor shape: {tensor.shape}")

    container_aspect = width / height
    tensor_aspect = tensor.shape[2] / tensor.shape[1] 

    if tensor_aspect > container_aspect:
        new_width = width
        new_height = round(width / tensor_aspect)
    else:
        new_width = round(height * tensor_aspect)
        new_height = height

    offset_x = (width - new_width) // 2
    offset_y = (height - new_height) // 2

    resized_tensor = torch.nn.functional.interpolate(tensor.unsqueeze(0), size = (new_height, new_width), mode = "bilinear", align_corners = False).squeeze(0)

    new_tensor = torch.zeros((tensor.shape[0], height, width), dtype=tensor.dtype, device=tensor.device)
    new_tensor[..., offset_y:offset_y + new_height, offset_x:offset_x + new_width] = resized_tensor

    return new_tensor, (offset_x, offset_y, new_width, new_height)

# Format a duration.
def format_duration(seconds: float):
    parts = []

    if seconds >= 86400:
        parts.append(f"{int(seconds / 86400)}d")
        seconds = seconds % 86400 

    if seconds >= 3600:
        parts.append(f"{int(seconds / 3600)}h")
        seconds = seconds % 3600

    if seconds >= 60:
        parts.append(f"{int(seconds / 60)}m")
        seconds = seconds % 60

    if seconds > 0:
        parts.append(f"{int(seconds)}s")
        seconds = seconds % 60
    elif seconds < 1:
        parts.append(f"{int(seconds * 1000)}ms")

    return " ".join(parts)

# Calculate the average difference between items in an array.
def average_difference(array: list[float]) -> float:
    if len(array) < 2:
        return 0.0

    diffs = [array[i] - array[i + 1] for i in range(len(array) - 1)]

    return sum(diffs) / len(diffs)
