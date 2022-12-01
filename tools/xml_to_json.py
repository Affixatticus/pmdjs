import json
import os


root = "../public/assets/textures/pokemon/"

# Loop through all the folders in the root directory
for folder in os.listdir(root):
    # Loop though each subfolder in the folder
    for sheets in os.listdir(root + folder + "/sheets"):
        animdata_path = root + folder + "/sheets/" + sheets + "/AnimData.xml"
        # Look for a file called AnimData.xml
        if os.path.isfile(animdata_path):
            # If it exists, convert it to JSON
            print(animdata_path)

            # Open the file
            with open(animdata_path, "r") as f:
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
                    c = c.replace("<" + prop + ">", '"' + prop[0].lower() + prop[1:] + '": ')
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

                print(c)

                data = json.loads(c)

                # Add a source property matching the key
                for key in data["anims"]:
                    data["anims"][key]["source"] = key

                # Find all the animations with a copyOf property
                for anim in data["anims"]:
                    if "copyOf" in data["anims"][anim]:
                        # Copy the animation from the copyOf property
                        data["anims"][anim] = data["anims"][data["anims"][anim]["copyOf"]]
                        
                
                print(data)
                # Write the new contents to a new file
                with open(animdata_path.replace(".xml", ".json"), "w") as f:

                    json.dump(data, f, indent=2)
