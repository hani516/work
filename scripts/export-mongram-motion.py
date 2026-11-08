#!/usr/bin/env python3
"""Export exact app motion frames without translating its Swift animation policy.
Usage: python3 scripts/export-mongram-motion.py /path/to/Mongram/Core/HomePoodleMotion.swift
"""
from pathlib import Path
import argparse, hashlib, json, subprocess, tempfile

HARNESS = r'''
// Gallery extraction harness. The app policy above is copied without changes.
func frame(_ p:HomePoodlePose)->[Double] {
 [p.breathScaleY,p.blink,p.headDegrees,p.headOffsetX,p.headOffsetY,p.noseScale,p.mouthOpen,p.tailDegrees,p.earAmount,p.pawAmount]
}
// Find a seed that schedules the source's actual yawn action in the first idle cycle.
var yawnSeed:UInt64=0
var yawnStart=0.0
outer:for seed in UInt64(0)..<UInt64(1000) {
 for delay in 12...18 {
  let p=HomePoodleMotion.pose(elapsed:Double(delay)+1,sinceTap:nil,animate:true,seed:seed)
  if p.mouthOpen>0.99 {yawnSeed=seed;yawnStart=Double(delay);break outer}
 }
}
precondition(yawnStart>=12)
let kinds=["seated","resting","ears","head","blink","yawn","paw","tail"]
let fps=HomePoodleMotion.framesPerSecond
let count=Int(8.4*fps)+1
var tracks:[String:[[Double]]]=[:]
for kind in kinds {
 tracks[kind]=(0..<count).map { i in
  let t=Double(i)/fps
  let p:HomePoodlePose
  switch kind {
  case "resting":p=HomePoodleMotion.pose(elapsed:t,sinceTap:t,animate:true,resting:true,part:.body)
  case "ears":p=HomePoodleMotion.pose(elapsed:t,sinceTap:t,animate:true,part:.ears)
  case "head":p=HomePoodleMotion.pose(elapsed:t,sinceTap:t,animate:true,part:.head,shake:false)
  case "paw":p=HomePoodleMotion.pose(elapsed:t,sinceTap:t,animate:true,part:.paw)
  case "tail":p=HomePoodleMotion.pose(elapsed:t,sinceTap:t,animate:true,part:.tail)
  case "yawn":p=HomePoodleMotion.pose(elapsed:t+yawnStart,sinceTap:nil,animate:true,seed:yawnSeed)
  default:p=HomePoodleMotion.pose(elapsed:t,sinceTap:nil,animate:true)
  }
  return frame(p)
 }
}
let payload:[String:Any]=["fps":fps,"duration":8.4,"columns":["breathScaleY","blink","headDegrees","headOffsetX","headOffsetY","noseScale","mouthOpen","tailDegrees","earAmount","pawAmount"],"tracks":tracks,"yawnSeed":yawnSeed,"yawnSourceStart":yawnStart]
let data=try JSONSerialization.data(withJSONObject:payload,options:[.sortedKeys])
FileHandle.standardOutput.write(data)
'''

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("--source-commit", default="unknown")
parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "assets/mongram/poodle/app-motion.json")
args = parser.parse_args()
source = args.source.read_bytes()
with tempfile.TemporaryDirectory(prefix="mongram-motion-") as directory:
    swift = Path(directory) / "Extract.swift"
    swift.write_text(source.decode() + HARNESS)
    data = json.loads(subprocess.check_output(["swift", str(swift)], text=True))
data["source"] = {"file": "Mongram/Core/HomePoodleMotion.swift", "commit": args.source_commit,
                  "sha256": hashlib.sha256(source).hexdigest(),
                  "method": "Frames evaluated by the original Swift policy at 24 fps. Each gallery track repeats one untouched 8.4-second source segment."}
assert data["fps"] == 24 and set(data["tracks"]) == {"seated", "resting", "ears", "head", "blink", "yawn", "paw", "tail"}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(data, separators=(",", ":")) + "\n")
print(f"Exported {len(data['tracks'])} original motion tracks to {args.output}")
