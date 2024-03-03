from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
from openai import OpenAI
import os
import base64
import logging
import time

client = OpenAI()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])  # Allow requests from the frontend

UPLOAD_FOLDER = 'uploads'  # Folder to store uploaded images
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}  # Supported file formats for GPT 4 Vision

# Setup Basic Logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)  # Set handler level to DEBUG

logger.addHandler(console_handler)


def construct_image_payload(images):
    final_payload = []
    for image in images:
        logger.debug(f"Constructing image payload for image: {image[:20]}...")
        payload = {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{image}"
            }
        }
        final_payload.append(payload)
    return final_payload


def construct_hint_payload(hint):
    logger.debug(f"Constructing hint payload for hint: {hint}")
    return {
        "type": "text",
        "text": f"A hint concerning the editing changes made between the images to help you find the difference: {hint}"
    }


def compare_images(files, hint):
    base64_images = []
    for file in files:

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            logger.info(f"File {file.filename} saved successfully")

            base64_image = encode_image(filepath)
            base64_images.append(base64_image)
        else:
            logger.error(f"File {file.filename} is not a valid image file or does not have a valid extension")

    images_payload = construct_image_payload(base64_images)
    response = client.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "What’s the editing differences made between these images and which one would you choose because of those editing choices?"
                    },
                    *([construct_hint_payload(hint)] if hint is not None else []),
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


def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/upload', methods=['POST'])
def upload_images():
    hint = None
    if 'images' not in request.files:
        logger.error("The request does not contain any files")
        return jsonify({'error': 'No files uploaded'}), 400
    if 'hint' in request.form:
        logger.info(f"Found hint in request")
        hint = request.form['hint']

    files = request.files.getlist('images')

    return jsonify({'message': compare_images(files, hint)}), 201


if __name__ == "__main__":
    app.run(debug=True)
