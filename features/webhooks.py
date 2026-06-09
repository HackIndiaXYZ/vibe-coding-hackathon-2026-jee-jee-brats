import logging
import re
from uuid import uuid4
from fastapi import APIRouter, Form, HTTPException, status

from features.schemas import WhatsAppWebhookResponse

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/whatsapp", response_model=WhatsAppWebhookResponse, summary="Twilio WhatsApp Webhook")
async def whatsapp_webhook(
    Body: str = Form(...),
    From: str = Form(...),
):
    """
    WhatsApp Voice/Text Booking Webhook:
    - Parses an incoming Twilio WhatsApp text payload.
    - Extracts entities using basic regex (from <Location> to <Location>).
    - Mocks triggering the load creation pipeline.
    """
    logger.info(f"Received WhatsApp message from {From}: {Body}")
    
    # Basic NLP mock using Regex
    # Matches: "Need a tempo from Indiranagar to Koramangala"
    match = re.search(r"from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+)", Body, re.IGNORECASE)
    
    if match:
        pickup = match.group(1).strip()
        dropoff = match.group(2).strip()
        
        # Mock load creation pipeline
        mock_load_id = str(uuid4())
        logger.info(f"Triggering load creation pipeline for {pickup} -> {dropoff} (Load ID: {mock_load_id})")
        
        return WhatsAppWebhookResponse(
            success=True,
            message=f"Booking created successfully for {pickup} to {dropoff}",
            load_id=mock_load_id,
            extracted_pickup=pickup,
            extracted_dropoff=dropoff,
        )
    else:
        logger.warning(f"Could not parse locations from message: {Body}")
        return WhatsAppWebhookResponse(
            success=False,
            message="Could not understand the pickup and dropoff locations. Please say 'from [Location] to [Location]'.",
        )
