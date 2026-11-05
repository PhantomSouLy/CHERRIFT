"""Legacy command retained: validates the complete source poses, not limb masks."""
from pathlib import Path
from PIL import Image,ImageOps,ImageChops
import unittest
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/player/cherry_skins/sport_cherry/sheets192'
class WholePoseTests(unittest.TestCase):
 def test_complete_source_frames(self):
  for state in ['idle','attack']:
   for direction in ['down','down_right','right','up_right','up','up_left','left','down_left']:
    with self.subTest(state=state,direction=direction),Image.open(ART/f'sport_cherry_{state}_{direction}.png') as sheet:
     self.assertEqual(sheet.size,(1152,192))
     for f in range(6):
      box=sheet.crop((f*192,0,(f+1)*192,192)).getchannel('A').getbbox()
      self.assertIsNotNone(box);self.assertGreater(box[0],0);self.assertGreater(box[1],0);self.assertLess(box[2],192);self.assertLess(box[3],192)
 def test_mirrored_whole_pose_pixels(self):
  for state in ['idle','attack']:
   for direction,source in {'left':'right','down_left':'down_right','up_left':'up_right'}.items():
    with self.subTest(state=state,direction=direction),Image.open(ART/f'sport_cherry_{state}_{direction}.png') as sheet,Image.open(ART/f'sport_cherry_{state}_{source}.png') as original:
     for f in range(6):
      a=sheet.crop((f*192,0,(f+1)*192,192));b=ImageOps.mirror(original.crop((f*192,0,(f+1)*192,192)))
      self.assertIsNone(ImageChops.difference(a,b).getbbox())
if __name__=='__main__':unittest.main()
