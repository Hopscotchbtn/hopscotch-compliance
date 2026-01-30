"""Flask web application for Risk Assessment Generator."""

import os
import uuid
from flask import Flask, render_template, request, flash, redirect, url_for, send_file

from .hazard_identifier import HazardIdentifier
from .models import AgeGroup
from .document_generator import generate_docx

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-key-change-in-production")

# Simple in-memory storage for assessments (for download functionality)
# In production, you'd want to use a proper cache like Redis
assessment_cache = {}

AGE_GROUP_MAP = {
    "baby": AgeGroup.BABY,
    "toddler": AgeGroup.TODDLER,
    "preschool": AgeGroup.PRESCHOOL,
    "pre_k": AgeGroup.PRE_KINDERGARTEN,
    "reception": AgeGroup.RECEPTION,
}


@app.route("/", methods=["GET"])
def index():
    """Show the main form."""
    return render_template("index.html", age_groups=AGE_GROUP_MAP)


@app.route("/generate", methods=["POST"])
def generate():
    """Generate a risk assessment."""
    activity_name = request.form.get("activity_name", "").strip()
    activity_description = request.form.get("activity_description", "").strip()
    location = request.form.get("location", "Nursery").strip()
    selected_ages = request.form.getlist("age_groups")
    assessor_name = request.form.get("assessor_name", "").strip()

    if not activity_name or not activity_description:
        flash("Please provide both activity name and description.", "error")
        return redirect(url_for("index"))

    age_groups = [AGE_GROUP_MAP[age] for age in selected_ages if age in AGE_GROUP_MAP]
    if not age_groups:
        age_groups = [AgeGroup.ALL]

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        flash("API key not configured. Please set ANTHROPIC_API_KEY environment variable.", "error")
        return redirect(url_for("index"))

    try:
        identifier = HazardIdentifier(api_key=api_key)
        assessment = identifier.identify_hazards(
            activity_name=activity_name,
            activity_description=activity_description,
            location=location,
            age_groups=age_groups,
        )
        assessment.assessor_name = assessor_name

        # Store assessment for download
        assessment_id = str(uuid.uuid4())
        assessment_cache[assessment_id] = assessment

        return render_template("result.html", assessment=assessment, assessment_id=assessment_id)

    except Exception as e:
        flash(f"Error generating assessment: {str(e)}", "error")
        return redirect(url_for("index"))


@app.route("/download/<assessment_id>")
def download(assessment_id):
    """Download assessment as DOCX."""
    assessment = assessment_cache.get(assessment_id)

    if not assessment:
        flash("Assessment not found. Please generate a new one.", "error")
        return redirect(url_for("index"))

    docx_buffer = generate_docx(assessment)

    filename = f"risk_assessment_{assessment.activity_name.lower().replace(' ', '_')}.docx"

    return send_file(
        docx_buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


def run_server(host="127.0.0.1", port=5000, debug=False):
    """Run the Flask development server."""
    app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    run_server(debug=True)
