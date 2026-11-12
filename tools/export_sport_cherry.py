"""Compatibility entry point for Sport Cherry's complete-pose exporter.
The old flow/landmark/inverse-warp export has been retired.
"""
from pathlib import Path
import runpy
if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).with_name('export_sport_whole_frames.py')),run_name='__main__')
