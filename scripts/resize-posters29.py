from PIL import Image
from pathlib import Path
folder=Path(__file__).resolve().parents[1]/'public/assets/posters'
count=0
for source in sorted(folder.glob('*.jpg')):
 if not source.name.startswith('poster-'): continue
 with Image.open(source) as image:
  for width in (320,640):
   height=round(image.height*width/image.width)
   out=source.with_suffix(f'.{width}.webp')
   image.resize((width,height),Image.Resampling.LANCZOS).save(out,'WEBP',quality=78,method=5)
   count+=1
print('optimized poster sizes',count)
