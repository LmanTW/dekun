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
