from PIL import Image
import os

def resize_icon(input_path, output_dir):
    img = Image.open(input_path)
    sizes = [16, 32, 48, 128]
    for size in sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(os.path.join(output_dir, f'icon{size}.png'))

if __name__ == "__main__":
    resize_icon('/home/ubuntu/opini/icons/icon.png', '/home/ubuntu/opini/icons')
