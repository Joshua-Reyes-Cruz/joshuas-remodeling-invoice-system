"""Optional Python service for calculations and the DocuSign send operation."""

from __future__ import annotations

from flask import Flask, jsonify, request

from docusign_gateway import DocuSignGateway, DocuSignNotConfigured, SignatureRecipient
from invoice_engine import calculate_payload

app = Flask(__name__)


@app.get("/health")
def health():
    return {"status": "ok", "service": "joshuas-remodeling-invoice-api"}


@app.post("/api/calculate")
def calculate():
    payload = request.get_json(silent=True) or {}
    return jsonify(calculate_payload(payload))


@app.post("/api/signatures/send")
def send_signature_request():
    payload = request.get_json(silent=True) or {}
    required = ("documentId", "documentHtml", "documentName", "recipientName", "recipientEmail")
    missing = [key for key in required if not str(payload.get(key, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing: {', '.join(missing)}"}), 400
    try:
        result = DocuSignGateway().send_html_document(
            document_id=payload["documentId"],
            document_html=payload["documentHtml"],
            document_name=payload["documentName"],
            recipient=SignatureRecipient(payload["recipientName"], payload["recipientEmail"]),
        )
        return jsonify({"envelopeId": result.get("envelopeId"), "status": result.get("status")}), 201
    except DocuSignNotConfigured as error:
        return jsonify({"error": str(error), "code": "DOCUSIGN_NOT_CONFIGURED"}), 409


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=True)
