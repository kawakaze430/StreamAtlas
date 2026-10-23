"""Generate original, non-explicit artwork and sample media. Requires Pillow + FFmpeg."""
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import math, random, subprocess, pathlib, colorsys
ROOT=pathlib.Path(__file__).resolve().parents[1]
POSTERS=ROOT/'public/assets/posters'; VIDEOS=ROOT/'public/assets/videos'
POSTERS.mkdir(parents=True,exist_ok=True); VIDEOS.mkdir(parents=True,exist_ok=True)
try:
 bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
 regular='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
 font=lambda s,b=False:ImageFont.truetype(bold if b else regular,s)
except Exception:
 font=lambda s,b=False:ImageFont.load_default()
styles=[
 ('NIGHT VISION',(34,28,70),(202,67,129)),('GOLDEN HOUR',(62,39,20),(224,142,68)),('BLUE MOTION',(14,50,76),(73,157,209)),
 ('DUSK STORIES',(58,34,64),(201,97,117)),('SOFT FOCUS',(49,39,77),(130,104,211)),('CITY LIGHTS',(19,45,52),(55,180,163)),
 ('PORTRAIT SERIES',(44,30,40),(203,111,128)),('VIOLET FRAMES',(30,27,64),(133,98,210)),('STUDIO SESSION',(49,57,51),(163,195,91)),
 ('MIDNIGHT EDIT',(10,35,70),(39,100,187)),('COLOR STUDY',(65,37,51),(233,84,93)),('ARCHIVE REEL',(44,43,59),(134,126,167)),
 ('VISUAL DIARY',(33,58,69),(104,198,188)),('NORTHLIGHT',(28,42,55),(215,182,109)),('AURORA 4K',(35,27,67),(169,103,219)),
 ('ECHOES',(23,39,69),(74,141,214)),('REFLECTIONS',(49,33,52),(220,118,171)),('AFTER HOURS',(37,35,44),(242,171,68))]
for i,(title,c1,c2) in enumerate(styles,1):
 W,H=700,438
 img=Image.new('RGB',(W,H));pix=img.load()
 for y in range(H):
  for x in range(W):
   wave=.5+.5*math.sin(x*.004+y*.008+i*.77)
   t=min(1,max(0,y/H*.6+x/W*.25+wave*.12))
   pix[x,y]=tuple(int(c1[k]*(1-t)+c2[k]*t) for k in range(3))
 glow=Image.new('RGBA',(W,H));d=ImageDraw.Draw(glow)
 r=random.Random(130+i)
 for j in range(16):
  x=r.randint(-100,W+100);y=r.randint(-80,H+80);rad=r.randint(15,105)
  col=r.choice([(255,225,183,35),(244,144,204,55),(137,218,255,36)])
  d.ellipse((x-rad,y-rad,x+rad,y+rad),fill=col)
 glow=glow.filter(ImageFilter.GaussianBlur(35))
 img=Image.alpha_composite(img.convert('RGBA'),glow)
 d=ImageDraw.Draw(img,'RGBA')
 for j in range(5):
  x=120+j*135+r.randint(-50,50)
  d.polygon([(x-75,H+30),(x+55,-60),(x+118,-60),(x-10,H+30)],fill=(255,255,255,7+j*3))
 for j in range(8):
  x=r.randint(0,W);y=r.randint(0,H)
  d.ellipse((x,y,x+r.randint(3,15),y+r.randint(3,15)),fill=(255,255,255,35))
 d.rectangle((0,H-146,W,H),fill=(7,10,19,140))
 d.text((34,H-123),'STREAMATLAS  /  ORIGINALS',font=font(18,True),fill=(248,207,115,230))
 d.text((32,H-88),title,font=font(38,True),fill=(255,255,255,245))
 d.text((35,H-38),f'FEATURED EDITION   /   0{i:02d}',font=font(17),fill=(223,228,237,200))
 img.convert('RGB').save(POSTERS/f'poster-{i}.jpg',quality=87,optimize=True)
 print('poster',i)
for i in range(1,13):
 W,H=450,560;r=random.Random(911+i)
 bg=r.choice([(41,44,71),(28,60,73),(70,42,66),(58,54,41),(41,38,62)])
 im=Image.new('RGB',(W,H),bg);d=ImageDraw.Draw(im,'RGBA')
 # Original stylized profile illustration, not a real person.
 for j in range(9):
  k=r.randint(-80,W);l=r.randint(-50,H);rad=r.randint(40,140)
  d.ellipse((k-rad,l-rad,k+rad,l+rad),fill=(255,255,255,6))
 skin=r.choice([(232,174,141,255),(182,129,102,255),(118,81,72,255),(215,165,142,255)])
 jacket=r.choice([(83,123,153,255),(176,100,118,255),(114,108,174,255),(187,147,72,255)])
 d.ellipse((-75,345,525,900),fill=jacket)
 d.rounded_rectangle((167,295,287,407),radius=30,fill=skin)
 d.ellipse((130,125,320,345),fill=skin)
 d.pieslice((120,110,330,295),180,360,fill=(33,29,38,255))
 d.ellipse((180,245,196,255),fill=(54,42,46,180));d.ellipse((250,245,266,255),fill=(54,42,46,180))
 d.arc((205,275,247,297),5,170,fill=(83,51,51,130),width=4)
 d.rectangle((0,H-75,W,H),fill=(7,10,20,130))
 d.text((20,H-55),f'ARTIST PROFILE  /  {i:02d}',font=font(22,True),fill=(255,255,255,235))
 im.save(POSTERS/f'person-{i}.jpg',quality=88,optimize=True)
 print('profile',i)
for i in range(1,5):
 src=POSTERS/f'poster-{i}.jpg';out=VIDEOS/f'sample-{i}.mp4'
 cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-loop','1','-i',str(src),'-vf',"scale=700:438,zoompan=z='min(zoom+0.001,1.2)':d=112:s=640x360:fps=14,format=yuv420p",'-t','8','-c:v','libx264','-preset','veryfast','-crf','32','-movflags','+faststart',str(out)]
 subprocess.run(cmd,check=True,timeout=90)
 print('video',i,out.stat().st_size)
