# dekun

dekun (pronounced [/diːˈkuːn/](https://ipa-reader.com/?text=%2Fdi%CB%90%CB%88ku%CB%90n%2F)) is a toolkit for marking and regenerating parts of an image. dekun consists of two separate models: the marker and the inpainter. You can use pre-trained models or train the model yourself.

> [!WARNING]
> This project is still under heavy development, things might break at anytime.

## 📦 Installation

```bash
uv tool install git+https://github.com/LmanTW/dekun
```

> [!NOTE]
> If you want support for hardware acceleration backend other than cpu or cuda, you'll need to clone the repository and then run `uv sync --group <group>`. The avialiable groups are: "cpu", "xpu" and "cuda".
