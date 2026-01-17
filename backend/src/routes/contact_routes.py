from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import (
    ContactSubmission, ContactSubmissionResponse, Inquiry, InquiryCreate, 
    User, APIResponse, generate_id, get_current_timestamp
)
from email_service import get_email_service, EmailService
from auth import get_current_active_user, get_current_admin_user
from config import get_database, get_settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contact", tags=["contact"])

@router.post("/submit", response_model=ContactSubmissionResponse)
async def submit_contact_form(
    contact_data: ContactSubmission,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_database),
    email_service: EmailService = Depends(get_email_service)
):
    """Submit contact form and send notification emails"""
    try:
        # Server-side honeypot: if filled, silently accept without storing/emailing
        if getattr(contact_data, "website", None):
            logger.warning("Honeypot triggered on contact submit; dropping silently")
            return ContactSubmissionResponse(
                id=generate_id(),
                status="received",
                message="Thank you for your message. We'll get back to you soon!"
            )

        # Generate unique ID for the contact submission
        submission_id = generate_id()
        current_time = get_current_timestamp()
        
        # Store contact submission in database
        contact_doc = {
            "id": submission_id,
            "name": contact_data.name,
            "email": contact_data.email,
            "phone": contact_data.phone,
            "message": contact_data.message,
            "property_id": contact_data.property_id,
            "preferred_location": getattr(contact_data, "preferred_location", None),
            "map_pin": contact_data.map_pin.dict() if getattr(contact_data, "map_pin", None) else None,
            "status": "new",
            "created_at": current_time,
            "updated_at": current_time
        }
        
        await db.contact_submissions.insert_one(contact_doc)
        
        # Send email notifications in background
        background_tasks.add_task(
            email_service.send_contact_form_notification,
            contact_data
        )
        
        logger.info(f"Contact form submitted: {submission_id} from {contact_data.email}")
        
        return ContactSubmissionResponse(
            id=submission_id,
            status="received",
            message="Thank you for your message. We'll get back to you soon!"
        )
        
    except Exception as e:
        logger.error(f"Error submitting contact form: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit contact form"
        )

@router.get("/submissions", response_model=List[dict])
async def get_contact_submissions(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all contact submissions (admin only)"""
    try:
        query = {}
        if status_filter:
            query["status"] = status_filter
        if q:
            query["$or"] = [
                {"name": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
                {"phone": {"$regex": q, "$options": "i"}},
            ]
        # Date range filter on created_at
        if from_date or to_date:
            date_query = {}
            try:
                from_dt = None
                to_dt = None
                if from_date:
                    from_dt = __import__("datetime").datetime.fromisoformat(from_date)
                if to_date:
                    # include entire day when only date provided
                    to_dt = __import__("datetime").datetime.fromisoformat(to_date)
                    if len(to_date) == 10:  # YYYY-MM-DD
                        to_dt = to_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
                if from_dt:
                    date_query["$gte"] = from_dt
                if to_dt:
                    date_query["$lte"] = to_dt
                if date_query:
                    query["created_at"] = date_query
            except Exception:
                # If date parsing fails, ignore date filters to avoid 500s in dev endpoint
                pass
        
        submissions = []
        cursor = db.contact_submissions.find(query).sort("created_at", -1)
        
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id", doc.get("id")))
            submissions.append(doc)
        
        logger.info(f"Admin {current_user.email} retrieved {len(submissions)} contact submissions")
        return submissions
        
    except Exception as e:
        logger.error(f"Error retrieving contact submissions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve contact submissions"
        )

# Development-only public endpoint to list submissions without auth
@router.get("/submissions/public", response_model=List[dict])
async def get_contact_submissions_public(
    limit: int = 50,
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Public dev endpoint for listing contact submissions (no auth).
    Enabled only when environment is development or debug flag is true.
    """
    settings = get_settings()
    if not (settings.environment == "development" or settings.debug):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Public submissions endpoint disabled")

    try:
        query = {}
        if status_filter:
            query["status"] = status_filter

        submissions = []
        cursor = db.contact_submissions.find(query).sort("created_at", -1).limit(min(max(limit, 1), 200))

        async for doc in cursor:
            # Preserve the domain id if present; otherwise fallback to Mongo _id
            domain_id = doc.get("id") or str(doc.get("_id"))
            submissions.append({
                "id": domain_id,
                "name": doc.get("name"),
                "email": doc.get("email"),
                "phone": doc.get("phone"),
                "preferred_location": doc.get("preferred_location"),
                "map_pin": doc.get("map_pin"),
                "message": doc.get("message"),
                "status": doc.get("status"),
                "created_at": doc.get("created_at"),
                "updated_at": doc.get("updated_at"),
            })

        return submissions
    except Exception as e:
        logger.error(f"Error retrieving public contact submissions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve contact submissions"
        )

@router.put("/submissions/public/{submission_id}/status", response_model=APIResponse)
async def update_submission_status_public(
    submission_id: str,
    new_status: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Development-only public endpoint to update submission status without auth."""
    settings = get_settings()
    if not (settings.environment == "development" or settings.debug):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Public status update endpoint disabled")

    try:
        valid_statuses = ["new", "in_progress", "contacted", "resolved", "closed"]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

        result = await db.contact_submissions.update_one(
            {"id": submission_id},
            {"$set": {"status": new_status, "updated_at": get_current_timestamp()}}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact submission not found")

        return APIResponse(success=True, message=f"Status updated to {new_status}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating public submission status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update submission status"
        )

@router.put("/submissions/{submission_id}/status", response_model=APIResponse)
async def update_submission_status(
    submission_id: str,
    new_status: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update contact submission status (admin only)"""
    try:
        valid_statuses = ["new", "in_progress", "contacted", "resolved", "closed"]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        result = await db.contact_submissions.update_one(
            {"id": submission_id},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": get_current_timestamp(),
                    "updated_by": current_user.id
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact submission not found"
            )
        
        logger.info(f"Contact submission {submission_id} status updated to {new_status} by {current_user.email}")
        
        return APIResponse(
            success=True,
            message=f"Status updated to {new_status}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating submission status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update submission status"
        )

@router.post("/inquiries", response_model=Inquiry)
async def create_property_inquiry(
    inquiry_data: InquiryCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
    email_service: EmailService = Depends(get_email_service)
):
    """Create a property inquiry (authenticated users only)"""
    try:
        # Generate unique ID for the inquiry
        inquiry_id = generate_id()
        current_time = get_current_timestamp()
        
        # Create inquiry document
        inquiry_doc = {
            "id": inquiry_id,
            "property_id": inquiry_data.property_id,
            "user_id": current_user.id,
            "message": inquiry_data.message,
            "contact_method": inquiry_data.contact_method,
            "status": "new",
            "created_at": current_time,
            "updated_at": current_time,
            "response": None
        }
        
        await db.inquiries.insert_one(inquiry_doc)
        
        # Get property info for email notification
        property_doc = await db.properties.find_one({"id": inquiry_data.property_id})
        property_title = property_doc.get("title", "Unknown Property") if property_doc else "Unknown Property"
        
        # Send email notifications in background
        background_tasks.add_task(
            email_service.send_property_inquiry_notification,
            current_user.email,
            f"{current_user.first_name} {current_user.last_name}",
            property_title,
            inquiry_data.message
        )
        
        # Return created inquiry
        inquiry = Inquiry(**inquiry_doc)
        
        logger.info(f"Property inquiry created: {inquiry_id} by user {current_user.id}")
        return inquiry
        
    except Exception as e:
        logger.error(f"Error creating property inquiry: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create property inquiry"
        )

@router.get("/inquiries", response_model=List[Inquiry])
async def get_all_inquiries(
    status_filter: Optional[str] = None,
    property_id: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all property inquiries (admin only)"""
    try:
        query = {}
        if status_filter:
            query["status"] = status_filter
        if property_id:
            query["property_id"] = property_id
        
        inquiries = []
        cursor = db.inquiries.find(query).sort("created_at", -1)
        
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id", doc.get("id")))
            inquiries.append(Inquiry(**doc))
        
        logger.info(f"Admin {current_user.email} retrieved {len(inquiries)} inquiries")
        return inquiries
        
    except Exception as e:
        logger.error(f"Error retrieving inquiries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve inquiries"
        )

@router.get("/inquiries/my", response_model=List[Inquiry])
async def get_my_inquiries(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get current user's inquiries"""
    try:
        inquiries = []
        cursor = db.inquiries.find({"user_id": current_user.id}).sort("created_at", -1)
        
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id", doc.get("id")))
            inquiries.append(Inquiry(**doc))
        
        return inquiries
        
    except Exception as e:
        logger.error(f"Error retrieving user inquiries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve your inquiries"
        )

@router.put("/inquiries/{inquiry_id}/status", response_model=APIResponse)
async def update_inquiry_status(
    inquiry_id: str,
    new_status: str,
    response_message: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update inquiry status and add response (admin only)"""
    try:
        valid_statuses = ["new", "contacted", "closed"]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        update_data = {
            "status": new_status,
            "updated_at": get_current_timestamp(),
            "updated_by": current_user.id
        }
        
        if response_message:
            update_data["response"] = response_message
        
        result = await db.inquiries.update_one(
            {"id": inquiry_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inquiry not found"
            )
        
        logger.info(f"Inquiry {inquiry_id} status updated to {new_status} by {current_user.email}")
        
        return APIResponse(
            success=True,
            message=f"Inquiry status updated to {new_status}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating inquiry status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update inquiry status"
        )

@router.get("/inquiries/{inquiry_id}", response_model=Inquiry)
async def get_inquiry_by_id(
    inquiry_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get specific inquiry by ID"""
    try:
        inquiry_doc = await db.inquiries.find_one({"id": inquiry_id})
        
        if not inquiry_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inquiry not found"
            )
        
        # Check permissions - users can only see their own inquiries, admins can see all
        if current_user.role != "admin" and inquiry_doc["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own inquiries"
            )
        
        inquiry_doc["id"] = str(inquiry_doc.pop("_id", inquiry_doc.get("id")))
        return Inquiry(**inquiry_doc)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving inquiry {inquiry_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve inquiry"
        )

@router.delete("/submissions/{submission_id}", response_model=APIResponse)
async def delete_contact_submission(
    submission_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a contact submission (admin only)"""
    try:
        result = await db.contact_submissions.delete_one({"id": submission_id})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact submission not found"
            )
        
        logger.info(f"Contact submission {submission_id} deleted by {current_user.email}")
        
        return APIResponse(
            success=True,
            message="Contact submission deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting contact submission: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete contact submission"
        )

@router.delete("/submissions/public/{submission_id}", response_model=APIResponse)
async def delete_contact_submission_public(
    submission_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Development-only public endpoint to delete contact submission without auth."""
    settings = get_settings()
    if not (settings.environment == "development" or settings.debug):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Public delete endpoint disabled")

    try:
        result = await db.contact_submissions.delete_one({"id": submission_id})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact submission not found"
            )
        
        logger.info(f"Contact submission {submission_id} deleted via public endpoint")
        
        return APIResponse(
            success=True,
            message="Contact submission deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting contact submission: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete contact submission"
        )