from PIL import Image
img = Image.open('playwright_state_error.png')
colors = img.getcolors(maxcolors=256)
if colors:
    print(f"Colors: {len(colors)}")
    for count, color in colors:
        print(f"Count: {count}, Color: {color}")
else:
    print("More than 256 colors")
