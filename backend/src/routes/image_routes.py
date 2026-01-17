from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from fastapi.responses import FileResponse
from typing import List
import logging
import os

from image_service import image_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/images", tags=["images"])

@router.post("/upload/{property_id}")
async def upload_property_images(
    property_id: str,
    files: List[UploadFile] = File(...)
):
    """Upload images for a property"""
    try:
        # For now, allow uploads without authentication for development
        # In production, you might want to require authentication
        
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files provided"
            )
        
        # Upload images
        image_urls = await image_service.upload_images(files, property_id)
        
        return {
            "message": f"Successfully uploaded {len(image_urls)} images",
            "images": image_urls,
            "property_id": property_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading images for property {property_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload images"
        )

@router.get("/{property_id}/{filename}")
async def get_image(property_id: str, filename: str):
    """Serve an image file"""
    try:
        file_path = image_service.get_image_path(property_id, filename)
        if not file_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )
        
        return FileResponse(
            file_path,
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=3600"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving image {property_id}/{filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to serve image"
        )

@router.get("/{property_id}")
async def list_property_images(property_id: str):
    """List all images for a property"""
    try:
        images = image_service.list_property_images(property_id)
        return {
            "property_id": property_id,
            "images": images,
            "count": len(images)
        }
        
    except Exception as e:
        logger.error(f"Error listing images for property {property_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list images"
        )

@router.delete("/{property_id}/{filename}")
async def delete_image(
    property_id: str, 
    filename: str
):
    """Delete a specific image"""
    try:
        # For now, allow deletion without authentication for development
        # In production, you might want to require authentication
        
        success = await image_service.delete_image(property_id, filename)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )
        
        return {
            "message": "Image deleted successfully",
            "property_id": property_id,
            "filename": filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting image {property_id}/{filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete image"
        )

@router.delete("/{property_id}")
async def delete_all_property_images(
    property_id: str
):
    """Delete all images for a property"""
    try:
        # For now, allow deletion without authentication for development
        # In production, you might want to require authentication
        
        success = await image_service.delete_property_images(property_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property images not found"
            )
        
        return {
            "message": "All property images deleted successfully",
            "property_id": property_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting all images for property {property_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete property images"
        )
