import logging
from fastapi import APIRouter, HTTPException, status

from features.schemas import BookHelperRequest, BookHelperResponse

logger = logging.getLogger(__name__)

router = APIRouter()

HELPER_FEE_PER_HOUR = 150.0

@router.post("/book", response_model=BookHelperResponse, summary="Book helpers for a load")
async def book_helper(request: BookHelperRequest):
    """
    Helper on Demand:
    - Accepts load_id and num_helpers (1 or 2).
    - Calculates extra fee (₹150/hr per helper).
    - Mocks appending it to the load's total invoice.
    - Mocks dispatching a notification to the gig-worker pool.
    """
    logger.info(f"Booking {request.num_helpers} helper(s) for load {request.load_id}")
    
    # Calculate fee
    total_fee = request.num_helpers * HELPER_FEE_PER_HOUR
    
    # Mock: Append to invoice
    logger.info(f"Appended ₹{total_fee} to load {request.load_id} invoice")
    
    # Mock: Dispatch notification to gig-worker pool
    logger.info(f"Dispatched notification to Helper pool for load {request.load_id}")
    
    return BookHelperResponse(
        load_id=request.load_id,
        num_helpers=request.num_helpers,
        helper_fee=HELPER_FEE_PER_HOUR,
        total_fee_added=total_fee,
        status="booked",
        message=f"Successfully booked {request.num_helpers} helper(s). ₹{total_fee} added to invoice."
    )
