# import PIL
import sys
from PIL import Image

# import an image from the argument
im = Image.open(sys.argv[1])

# get the image pixels
pix = im.load()

# create an output image
out = Image.new("RGB", (504, 576))

START_POINT = (84, 163)

# copy over chunks of 24x24 pixels from the im to the out
for x in range(0, 24):
    for y in range(0, 24):
        out.paste(
            im.crop((START_POINT[0] + x * 25, 
                START_POINT[1] + y * 25, 
                START_POINT[0] + x * 25 + 24, 
                START_POINT[1] + y * 25 + 24)), (x * 24, y * 24))


# save the output image
out.save("textures.png")

