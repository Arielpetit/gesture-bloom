from PIL import Image

im1 = Image.open('/home/ariel/Desktop/gesture-bloom/public/test.jpeg')
im2 = Image.open('/home/ariel/Desktop/gesture-bloom/public/portrait.png')

# Check if it was stretched
print(f"im1 size: {im1.size}")
print(f"im2 size: {im2.size}")

# check pixels at corners or edges of im2 to see if there's padding
w, h = im2.size
print(f"Top-left: {im2.getpixel((0,0))}")
print(f"Bottom-right: {im2.getpixel((w-1, h-1))}")
print(f"Middle-left: {im2.getpixel((0, h//2))}")

