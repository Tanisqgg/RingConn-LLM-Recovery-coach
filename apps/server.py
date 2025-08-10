from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from coach_agent import run_chat
from plotter import plot_weekly_pie

app = Flask(__name__)
CORS(app)  # Allow frontend to access API

@app.route("/")
def home():
    return send_from_directory("../templates", "dashboardUI.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_msg = request.json.get("message", "")
    reply = run_chat(user_msg)
    return jsonify({"response": reply})

@app.route("/upload", methods=["POST"])
def upload():
    file = request.files['file']
    if file:
        filepath = f"data/sleep_segments.csv"
        file.save(filepath)
        return jsonify({"message": "File uploaded successfully!"})
    return jsonify({"error": "No file uploaded"}), 400

@app.route("/graph/pie", methods=["GET"])
def graph_pie():
    path = plot_weekly_pie()
    return jsonify({"image": path})

if __name__ == "__main__":
    app.run(port=5000)
