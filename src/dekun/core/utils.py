import torchvision.transforms as transform
import psutil
import torch

# Loading progress info.
class LoadProgress:

    # Initialize a loading progress info.
    def __init__(self, loaded: int, total: int):
        self.loaded = loaded
        self.total = total

# Training progress info.
class TrainProgress:

    # Initialize a training progress info.
    def __init__(self, iteration: int, loss: float, duration: int):
        self.iteration = iteration
        self.loss = loss
        self.duration = duration
    

# Resolve a device.
def resolve_device(device: str):
    if device == "auto":
        if torch.cuda.is_available():
            return "cuda"
        elif torch.xpu.is_available():
            return "xpu"
        elif torch.cpu.is_available():
            return "cpu"
        else:
            raise Exception("No device is available")
    elif device == "cpu":
        if not torch.cpu.is_available():
            raise Exception("Device not available: CPU")

        return "cpu"
    elif device == "xpu":
        if not torch.xpu.is_available():
            raise Exception("Device not available: XPU")

        return "xpu"
    elif device == "cuda":
        if not torch.cuda.is_available():
            raise Exception("Device not available: Cuda")

        return "cuda"
    else:
        raise ValueError(f"Unsupported device: {device}")

# Get the available memory of a device.
def device_available_memory(device: str):
    if device == "cpu":
        return psutil.virtual_memory().available
    elif device == "xpu":
        return torch.xpu.mem_get_info()[0]
    elif device == "cuda":
        return torch.cuda.mem_get_info()[0]
    else:
        raise ValueError(f"Unsupported device: {device}")

transform_image = transform.Compose([transform.ToTensor()])

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

    resized_tensor = torch.nn.functional.interpolate(tensor.unsqueeze(0), size=(new_height, new_width), mode="bilinear", align_corners=False).squeeze(0)

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
