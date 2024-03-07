from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
from openai import OpenAI
import os
import base64
import logging
from rawpy import imread
from PIL import Image

client = OpenAI()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])  # Allow requests from the frontend

GENERAL_PROMPT = "Answer in a few sentences in English recommending a choice or stating a clear decision without using Markdown."

RAW_TO_JPG_QUALITY = 65

PROMPTS = {
    "image_comparison_editing": "What’s the editing differences made between these images and which one would you choose because of those editing choices?" + GENERAL_PROMPT,
    "keep_or_delete": "If you theoretically had to decide between keeping or deleting this image, which one would you choose and why?" + GENERAL_PROMPT,
    "image_comparison_subject": "These images depict the same subject but from different angles or changes made to the subject. Which one would you choose and why?" + GENERAL_PROMPT,
    "idea": "What would your goal for an edit of this photo be and what would you do/ how would you edit the photo to achieve that goal?" + GENERAL_PROMPT
}

HINT_PROMPTS = {
    "image_comparison_editing": "A hint concerning the editing changes made between the images to help you find the difference",
    "keep_or_delete": "A hint concerning factors that would help you decide whether to keep or delete the image",
    "image_comparison_subject": "A hint concerning the differences between the images to help you decide which one to choose",
    "idea": "A hint concerning the goal for an edit of this photo to help you decide how to edit the photo to achieve that goal"
}

UPLOAD_FOLDER = 'uploads'  # Folder to store uploaded images
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}  # Supported file formats for GPT 4 Vision

# Setup Basic Logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)  # Set handler level to DEBUG

logger.addHandler(console_handler)


def construct_image_payload(images, detail="high"):
    final_payload = []
    for image in images:
        logger.debug(f"Constructing image payload for image: {image[:20]}...")
        payload = {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{image}",
                "detail": detail
            }
        }
        final_payload.append(payload)
    return final_payload


def construct_hint_payload(hint, mode):
    logger.debug(f"Constructing hint payload for hint: {hint}")
    return {
        "type": "text",
        "text": f"{HINT_PROMPTS[mode]}: {hint}"
    }


def raw_to_jpg(raw_file, jpg_file):
    print(raw_file)
    print(jpg_file)
    with imread(raw_file) as raw:
        rgb_image = raw.postprocess()

    pil_image = Image.fromarray(rgb_image)
    pil_image.save(jpg_file, quality=RAW_TO_JPG_QUALITY)


def compare_images(files, hint, mode):
    base64_images = []
    for file in files:

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            logger.info(f"File {file.filename} saved successfully")

            base64_image = encode_image(filepath)
            base64_images.append(base64_image)

            os.remove(filepath)
        elif file and allowed_file(file.filename, {'rw2'}):
            filename = secure_filename(file.filename)

            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)  # Save the RAW file

            jpg_file = os.path.join(app.config['UPLOAD_FOLDER'], f"{filename}.jpg")  # JPG file
            raw_to_jpg(filepath, jpg_file)  # Save the RAW file as a JPG file

            base64_image = encode_image(jpg_file)  # Encode the JPG file to base64
            base64_images.append(base64_image)

            os.remove(filepath)
            os.remove(jpg_file)
        else:
            logger.error(f"File {file.filename} is not a valid image file or does not have a valid extension")
            return

    images_payload = construct_image_payload(base64_images)
    response = client.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": PROMPTS[mode]
                    },
                    *([construct_hint_payload(hint, mode)] if hint is not None else []),
                    *images_payload
                ],
            }
        ],
        max_tokens=300,
    )
    logger.info("Received response from GPT-4 Vision")
    return response.choices[0].message.content


def encode_image(image_path):
    logger.debug(f"Encoding image {image_path} to base64")
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')


def allowed_file(filename, allowed_extensions=None):
    if allowed_extensions is None:
        allowed_extensions = ALLOWED_EXTENSIONS
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in allowed_extensions


@app.route('/upload', methods=['POST'])
def upload_images():
    hint = None
    if 'images' not in request.files:
        logger.error("The request does not contain any files")
        return jsonify({'error': 'No files uploaded'}), 400
    if 'mode' not in request.form:
        logger.error("Mode is missing from the request")
        return jsonify({'error': 'No mode was provided'}), 400
    if 'hint' in request.form:  # Optional hint
        logger.info(f"Found hint in request")
        hint = request.form['hint']

    mode = request.form['mode']
    files = request.files.getlist('images')

    return jsonify({'message': compare_images(files, hint, mode)}), 201


if __name__ == "__main__":
    app.run(debug=True)
