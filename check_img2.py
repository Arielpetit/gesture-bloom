from PIL import Image

im1 = Image.open('/home/ariel/Desktop/gesture-bloom/public/test.jpeg')
im2 = Image.open('/home/ariel/Desktop/gesture-bloom/public/portrait.png')

# Scale im1 to cover 1024x1024 and then crop, or whatever
def center_crop_and_resize(img, size):
    width, height = img.size
    target_width, target_height = size
    
    # Calculate aspect ratios
    aspect_img = width / height
    aspect_target = target_width / target_height
    
    if aspect_img > aspect_target:
        # Image is wider than target, crop width
        new_width = int(height * aspect_target)
        left = (width - new_width) // 2
        img_cropped = img.crop((left, 0, left + new_width, height))
    else:
        # Image is taller than target, crop height
        new_height = int(width / aspect_target)
        top = (height - new_height) // 2
        img_cropped = img.crop((0, top, width, top + new_height))
        
    return img_cropped.resize(size, Image.LANCZOS)

im3 = center_crop_and_resize(im1, (1024, 1024))
# compare im3 and im2
diff = 0
for x in range(1024):
    for y in range(1024):
        p2 = im2.getpixel((x,y))
        p3 = im3.getpixel((x,y))
        diff += sum(abs(a-b) for a,b in zip(p2, p3))

print("Diff per pixel:", diff / (1024*1024*3))

