# dekun

dekun (pronounced [/diːˈkuːn/](https://ipa-reader.com/?text=%2Fdi%CB%90%CB%88ku%CB%90n%2F)) is a toolkit for marking and regenerating parts of an image. dekun consists of two separate models: the marker and the inpainter. You can use pre-trained models or train the model yourself.

> [!WARNING]
> This project is still under heavy development, things might break at anytime.

## 📦 Installation

```bash
# Set the group to the hardware acceleration backend you want to use.
# The following are supported: "cpu", "xpu", "cuda".

uv tool install git+https://github.com/LmanTW/dekun --group cpu
```

> [!WARNING]
> Requirements: [uv](https://docs.astral.sh/uv), [git](https://git-scm.com).
