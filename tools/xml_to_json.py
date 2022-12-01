import json
import os


root = "..\\public\\assets\\textures\\pokemon\\sprite\\"


def create_json(path: str):
    # Open the file
    with open(path, "r") as f:
        print(path)

        # Read the contents
        c = f.read()

        # Replace the XML tags with JSON
        c = c.replace("<?xml version=\"1.0\" ?>", "{")
        c = c.replace("<AnimData>", "")
        c = c.replace("<ShadowSize>", '"shadowSize": ')
        c = c.replace("</ShadowSize>", ",")
        c = c.replace("<Anims>", '"anims": {')
        c = c.replace("<Anim>", "")
        c = c.replace("<Name>", '"')
        c = c.replace("</Name>", '": {')

        c = c.replace("<CopyOf>", '"copyOf": "')
        c = c.replace("</CopyOf>", '",')

        for prop in ["Index", "FrameWidth", "FrameHeight", "HitFrame", "ReturnFrame", "RushFrame"]:
            c = c.replace("<" + prop + ">", '"' +
                          prop[0].lower() + prop[1:] + '": ')
            c = c.replace("</" + prop + ">", ",")

        c = c.replace("<Durations>", '"durations": [')
        c = c.replace("<Duration>", "")
        c = c.replace("</Duration>", ",")
        c = c.replace("</Durations>", "],")

        c = c.replace("</Anim>", "} ,")
        c = c.replace("</Anims>", "}")
        c = c.replace("</AnimData>", "}")

        # Remove trailing commas
        c = c.replace(" ", "")
        c = c.replace("\n", "")
        c = c.replace("\t", "")
        c = c.replace(",]", "]")
        c = c.replace(",}", "}")

        data = json.loads(c)

        # Add a source property matching the key
        for key in data["anims"]:
            data["anims"][key]["source"] = key

        # Find all the animations with a copyOf property
        for anim in data["anims"]:
            if "copyOf" in data["anims"][anim]:
                # Copy the animation from the copyOf property
                data["anims"][anim] = data["anims"][data["anims"][anim]["copyOf"]]

        # Write the new contents to a new file
        with open(path.replace(".xml", ".json"), "w") as f:

            json.dump(data, f, indent=2)


# Loop through all the folders in the root directory
for species in os.listdir(root):
    # Explore all the subfolders recursively
    for root, dirs, files in os.walk(root + species):
        # Loop through all the files in the current folder
        for file in files:
            # Check if the file is an animation data file
            if file == "AnimData.xml":
                # Create a JSON file from the XML file
                create_json(root + "\\" + file)

