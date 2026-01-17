import os
import uuid
import shutil
from typing import List, Optional
from fastapi import UploadFile, HTTPException, status
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class ImageService:
    def __init__(self):
        # Local storage directory for images
        self.upload_dir = "/app/uploads/images"
        self.max_images = 10
        self.min_images = 1
        self.allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.max_dimension = 2048  # Max width/height in pixels
        
        # Create upload directory if it doesn't exist
        os.makedirs(self.upload_dir, exist_ok=True)
        
    def _validate_image_file(self, file: UploadFile) -> None:
        """Validate uploaded image file"""
        # Check file extension
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename is required"
            )
            
        file_ext = os.path.splitext(file.filename.lower())[1]
        if file_ext not in self.allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(self.allowed_extensions)}"
            )
        
        # Check file size
        if hasattr(file, 'size') and file.size and file.size > self.max_file_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {self.max_file_size // (1024*1024)}MB"
            )
    
    def _optimize_image(self, input_path: str, output_path: str) -> None:
        """Optimize image for web display"""
        try:
            with Image.open(input_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                # Resize if too large
                if img.width > self.max_dimension or img.height > self.max_dimension:
                    img.thumbnail((self.max_dimension, self.max_dimension), Image.Resampling.LANCZOS)
                
                # Save with optimization
                img.save(output_path, 'JPEG', quality=85, optimize=True)
                
        except Exception as e:
            logger.error(f"Error optimizing image: {e}")
            # If optimization fails, just copy the original
            shutil.copy2(input_path, output_path)
    
    async def upload_images(self, files: List[UploadFile], property_id: str) -> List[str]:
        """Upload multiple images for a property"""
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"At least {self.min_images} image is required"
            )
        
        if len(files) > self.max_images:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum {self.max_images} images allowed"
            )
        
        uploaded_urls = []
        property_dir = os.path.join(self.upload_dir, property_id)
        os.makedirs(property_dir, exist_ok=True)
        
        for i, file in enumerate(files):
            try:
                # Validate file
                self._validate_image_file(file)
                
                # Generate unique filename
                file_ext = os.path.splitext(file.filename.lower())[1]
                unique_filename = f"{uuid.uuid4()}{file_ext}"
                temp_path = os.path.join(property_dir, f"temp_{unique_filename}")
                final_path = os.path.join(property_dir, unique_filename)
                
                # Save uploaded file temporarily
                with open(temp_path, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)
                
                # Optimize and save final image
                self._optimize_image(temp_path, final_path)
                
                # Remove temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                # Generate URL for the image
                image_url = f"/api/images/{property_id}/{unique_filename}"
                uploaded_urls.append(image_url)
                
                logger.info(f"Successfully uploaded image: {image_url}")
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error uploading image {file.filename}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload image: {file.filename}"
                )
        
        return uploaded_urls
    
    async def delete_image(self, property_id: str, filename: str) -> bool:
        """Delete a specific image"""
        try:
            file_path = os.path.join(self.upload_dir, property_id, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted image: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting image: {e}")
            return False
    
    async def delete_property_images(self, property_id: str) -> bool:
        """Delete all images for a property"""
        try:
            property_dir = os.path.join(self.upload_dir, property_id)
            if os.path.exists(property_dir):
                shutil.rmtree(property_dir)
                logger.info(f"Deleted all images for property: {property_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting property images: {e}")
            return False
    
    def get_image_path(self, property_id: str, filename: str) -> Optional[str]:
        """Get the full path to an image file"""
        file_path = os.path.join(self.upload_dir, property_id, filename)
        if os.path.exists(file_path):
            return file_path
        return None
    
    def list_property_images(self, property_id: str) -> List[str]:
        """List all images for a property"""
        property_dir = os.path.join(self.upload_dir, property_id)
        if not os.path.exists(property_dir):
            return []
        
        images = []
        for filename in os.listdir(property_dir):
            if any(filename.lower().endswith(ext) for ext in self.allowed_extensions):
                images.append(f"/api/images/{property_id}/{filename}")
        
        return sorted(images)

# Global instance
image_service = ImageService()
