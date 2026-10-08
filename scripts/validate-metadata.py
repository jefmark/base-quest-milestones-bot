import json,glob,sys
for f in glob.glob("public/metadata/*.json"):
    with open(f) as x: d=json.load(x)
    assert isinstance(d.get("attributes"), list), f"{f}: attributes"
    assert d.get("image"), f"{f}: image"
print("Metadata OK")
