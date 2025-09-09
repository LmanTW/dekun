import torchvision.transforms as transform
import PIL.Image as pil
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
        raise Exception(f"Unknown device: {device}")

# Fit an image into a specified size.
def fit_image(image: pil.Image, width: int, height: int):
    container_aspect = width / height
    image_aspect = image.size[0] / image.size[1]

    new_width = 0
    new_height = 0

    if image_aspect > container_aspect:
        new_width = width
        new_height = round(width / image_aspect)
    else:
        new_width = round(height * image_aspect)
        new_height = height

    image = image.resize((new_width, new_height))
    offset_x = (width - new_width) // 2
    offset_y = (height - new_height) // 2

    new_image = pil.new(image.mode, (width, height), tuple([0] * len(image.mode)))
    new_image.paste(image, (offset_x, offset_y))

    return new_image, (offset_x, offset_y, new_width, new_height)

transform_image = transform.Compose([
    transform.ToTensor(),
    transform.Normalize(mean = [0.5] * 3, std = [0.5] * 3)
])

transform_mask = transform.Compose([
    transform.ToTensor()
])

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
def average_difference(array: list[float]):
    if len(array) < 2:
        return 0.0

    diffs = [array[i] - array[i + 1] for i in range(len(array) - 1)]

    return sum(diffs) / len(diffs)
