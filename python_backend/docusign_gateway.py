"""Small DocuSign adapter kept behind one interface for later provider swaps."""

from __future__ import annotations

import base64
import os
from dataclasses import dataclass

import requests


@dataclass(frozen=True)
class SignatureRecipient:
    name: str
    email: str


class DocuSignNotConfigured(RuntimeError):
    pass


class DocuSignGateway:
    def __init__(self) -> None:
        self.account_id = os.getenv("DOCUSIGN_ACCOUNT_ID", "")
        self.access_token = os.getenv("DOCUSIGN_ACCESS_TOKEN", "")
        self.base_url = os.getenv("DOCUSIGN_BASE_URL", "https://demo.docusign.net/restapi")
        if not self.account_id or not self.access_token:
            raise DocuSignNotConfigured("Connect a DocuSign account before sending live envelopes.")

    def send_html_document(
        self,
        *,
        document_id: str,
        document_html: str,
        document_name: str,
        recipient: SignatureRecipient,
    ) -> dict:
        encoded = base64.b64encode(document_html.encode("utf-8")).decode("ascii")
        payload = {
            "emailSubject": f"Signature requested: {document_name}",
            "documents": [{
                "documentBase64": encoded,
                "name": document_name,
                "fileExtension": "html",
                "documentId": "1",
            }],
            "recipients": {"signers": [{
                "email": recipient.email,
                "name": recipient.name,
                "recipientId": "1",
                "tabs": {"signHereTabs": [{"anchorString": "SIGNATURE_REQUIRED", "anchorYOffset": "-5"}]},
            }]},
            "status": "sent",
            "customFields": {"textCustomFields": [{"name": "document_id", "value": document_id, "show": "false"}]},
        }
        response = requests.post(
            f"{self.base_url}/v2.1/accounts/{self.account_id}/envelopes",
            headers={"authorization": f"Bearer {self.access_token}", "content-type": "application/json"},
            json=payload,
            timeout=20,
        )
        response.raise_for_status()
        return response.json()
