export const categories = [
  'Amateur','Anal','Asian','Animation','Behind the Scenes','BDSM','Blonde','Brunette','Compilation',
  'Cosplay','Couples','Documentary','European','Featured','Fitness','Interview','Lifestyle','Mature',
  'Music','Outdoor','POV','Romance','Solo','Studio','Vintage','Wellness','Travel','Creative'
];
export const networks = [
  {name:'Northlight Network',slug:'northlight-network',detail:'Curated independent filmmaking and channel collections.'},
  {name:'Velvet Media',slug:'velvet-media',detail:'Studio releases and editorial collections.'},
  {name:'Framehouse',slug:'framehouse',detail:'Creator-led media channels and original releases.'},
  {name:'Aurora Studios',slug:'aurora-studios',detail:'High-quality experimental footage and design reels.'},
  {name:'Cobalt Group',slug:'cobalt-group',detail:'Cinematic productions and visual stories.'},
  {name:'Bluepeak Media',slug:'bluepeak-media',detail:'Premium archive and contemporary media.'}
];
export const sites = [
  {name:'Northlight Originals',network:0},
  {name:'Velvet Stories',network:1},
  {name:'Framehouse Select',network:2},
  {name:'Aurora 4K',network:3},
  {name:'Cobalt Archive',network:4},
  {name:'Bluepeak Films',network:5},
  {name:'Northlight Plus',network:0},
  {name:'Velvet Classics',network:1},
  {name:'Aurora Sessions',network:3},
  {name:'Framehouse Daily',network:2}
];
export const performers = [
  {name:'Avery Monroe',country:'US'},{name:'Riley Hart',country:'GB'},
  {name:'Jordan Quinn',country:'CA'},{name:'Morgan Blake',country:'FR'},
  {name:'Skyler James',country:'US'},{name:'Taylor Rowan',country:'DE'},
  {name:'Parker Vale',country:'AU'},{name:'Casey Bennett',country:'IN'},
  {name:'Alex Rivera',country:'ES'},{name:'Jamie Ellis',country:'GB'},
  {name:'Drew Sinclair',country:'US'},{name:'Reese Ellis',country:'CA'}
];
export const channels = [
  {name:'Northlight Channel',site:0},{name:'Velvet Channel',site:1},
  {name:'Framehouse TV',site:2},{name:'Aurora Channel',site:3},
  {name:'Cobalt Studio',site:4},{name:'Bluepeak Originals',site:5},
  {name:'Northlight Extras',site:6},{name:'Velvet Retro',site:7},
  {name:'Aurora Journal',site:8},{name:'Framehouse Spotlight',site:9}
];
const titles = [
  'After Hours — The Neon Edit','Golden Hour: A Visual Story','Midnight Frames in Motion',
  'The Blue Hour Collection','Textures of the City','A Journey in Soft Focus',
  'The Studio Sessions Vol. 1','Deep Blue: Extended Cut','Daylight and Shadow',
  'The Portrait Series','Night Drive — Director’s Cut','The Art of the Close-Up',
  'Studio Moments in 4K','Cinematic Reflections','The Color Theory Project',
  'Frame by Frame: Episode One','The Nightlight Sessions','Slow Motion Stories',
  'Architectures of Light','The Urban Motion Edit','Through the Lens','The Creative Collection',
  'Electric Colors, Vol. 2','The Horizon Archives','A Study in Contrast',
  'Saturday Studio Stories','Echoes in Blue','Golden Tones and Motion',
  'A Portrait in Motion','Midnight Studio Diary','The Last Light Session','Archive of Dreams'
];
export const slug = s=>s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const videoSeeds = Array.from({length:72},(_,i)=>{
 const title=titles[i%titles.length]+(i>=32?` · Part ${Math.floor(i/32)+1}`:'');
 return {title,slug:slug(title)+'-'+(i+1),site:i%sites.length,channel:i%channels.length,
  views:Math.floor(158000/(1+i/2)+(i*927)%42000),upvotes:80+(i*37)%300,downvotes:1+(i*5)%12,
  length:8,published:i,quality:'SAMPLE',
  poster:`/assets/posters/poster-${(i%18)+1}.jpg`,video:`/assets/videos/sample-${(i%4)+1}.mp4`,
  performers:[i%performers.length,(i+5)%performers.length],
  categories:[i%categories.length,(i+5)%categories.length,(i+11)%categories.length],
 };
});
