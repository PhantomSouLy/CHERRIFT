"""Export imagegen's six transparent Common Healing spell components. No colour keying."""
from pathlib import Path
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[1]/'assets/effects/common_healing'
source=Image.open(root/'healing_source_clean.png').convert('RGBA')
assert source.size==(1536,1024)
atlas=Image.new('RGBA',source.size)
for i in range(6):
    cell=source.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512))
    a=np.array(cell);yy,xx=np.mgrid[:512,:512]
    edge=np.minimum.reduce([xx,yy,511-xx,511-yy]);t=np.clip(edge/12,0,1)
    a[:,:,3]=np.rint(a[:,:,3]*t*t*(3-2*t)).astype(np.uint8)
    a[a[:,:,3]==0]=0
    atlas.paste(Image.fromarray(a),((i%3)*512,(i//3)*512))
atlas.save(root/'healing_atlas.png')
