from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import (
    Property, PropertyCreate, PropertyUpdate, PropertySearchFilters, 
    MapBounds, Coordinates, User, APIResponse, generate_id, get_current_timestamp
)
from property_service import PropertyService
from maps_service import get_maps_service, GoogleMapsService
from auth import get_current_active_user, get_current_agent_or_admin_user
from config import get_database, get_settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/properties", tags=["properties"])

def get_property_service_dep(
    db: AsyncIOMotorDatabase = Depends(get_database),
    maps_service: GoogleMapsService = Depends(get_maps_service)
) -> PropertyService:
    return PropertyService(db, maps_service)

@router.post("/", response_model=Property)
async def create_property(
    property_data: PropertyCreate,
    current_user: User = Depends(get_current_agent_or_admin_user),
    property_service: PropertyService = Depends(get_property_service_dep)
):
    """Create a new property (agents and admins only)"""
    try:
        property = await property_service.create_property(property_data, current_user)
        logger.info(f"Property created: {property.id} by user {current_user.id}")
        return property
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating property: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create property"
        )

# Development-only public creation endpoint (no auth)
@router.post("/public", response_model=Property)
async def create_property_public(
    property_data: PropertyCreate,
    property_service: PropertyService = Depends(get_property_service_dep)
):
    """Create a property without auth (development only)."""
    settings = get_settings()
    if not (settings.environment == "development" or settings.debug):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Public property creation disabled")

    try:
        # If coordinates not provided, geocode using maps service
        if not property_data.coordinates:
            coordinates = await property_service.maps_service.geocode_address(
                property_data.address.full_address
            )
            if not coordinates:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unable to geocode the provided address"
                )
        else:
            coordinates = property_data.coordinates

        current_time = get_current_timestamp()
        property_doc = {
            "id": generate_id(),
            "title": property_data.title,
            "property_type": property_data.property_type,
            "status": property_data.status,
            "price": property_data.price,
            "bedrooms": property_data.bedrooms,
            "bathrooms": property_data.bathrooms,
            "square_feet": property_data.square_feet,
            "description": property_data.description,
            "features": property_data.features,
            "images": property_data.images,
            "address": property_data.address.dict(),
            "coordinates": coordinates.dict(),
            "agent_id": property_data.agent_id,
            "created_at": current_time,
            "updated_at": current_time
        }

        result = await property_service.db.properties.insert_one(property_doc)
        if not result.inserted_id:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create property")

        return Property(**{**property_doc, "coordinates": coordinates})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating property (public): {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create property")

@router.get("/", response_model=List[Property])
async def get_all_properties(
    property_service: PropertyService = Depends(get_property_service_dep)
):
    """Get all available properties"""
    try:
        # Default filter to show only available properties
        filters = PropertySearchFilters()
        properties = await property_service.search_properties(filters)
        return properties
        
    except Exception as e:
        logger.error(f"Error retrieving properties: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve properties"
        )

@router.get("/search", response_model=List[Property])
async def search_properties(
    # Map bounds parameters
    ne_lat: Optional[float] = Query(None, description="Northeast latitude"),
    ne_lng: Optional[float] = Query(None, description="Northeast longitude"),
    sw_lat: Optional[float] = Query(None, description="Southwest latitude"),
    sw_lng: Optional[float] = Query(None, description="Southwest longitude"),
    
    # Filter parameters
    property_types: Optional[List[str]] = Query(None, description="Property types (can repeat)"),
    min_price: Optional[int] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[int] = Query(None, ge=0, description="Maximum price"),
    min_bedrooms: Optional[int] = Query(None, ge=0, description="Minimum bedrooms"),
    max_bedrooms: Optional[int] = Query(None, ge=0, description="Maximum bedrooms"),
    min_bathrooms: Optional[float] = Query(None, ge=0, description="Minimum bathrooms"),
    max_bathrooms: Optional[float] = Query(None, ge=0, description="Maximum bathrooms"),
    min_square_feet: Optional[int] = Query(None, gt=0, description="Minimum square feet"),
    max_square_feet: Optional[int] = Query(None, gt=0, description="Maximum square feet"),
    city: Optional[str] = Query(None, description="City (address.city)"),
    state: Optional[str] = Query(None, description="State (address.state)"),
    features: Optional[List[str]] = Query(None, description="Required features (must contain all; can repeat)"),
    feature: Optional[str] = Query(None, description="Single feature alias for convenience"),
    status: Optional[List[str]] = Query(None, description="Property status"),
    
    property_service: PropertyService = Depends(get_property_service_dep)
):
    """Search properties with filters"""
    try:
        # Build map bounds if provided
        bounds = None
        if all([ne_lat, ne_lng, sw_lat, sw_lng]):
            bounds = MapBounds(
                northeast=Coordinates(latitude=ne_lat, longitude=ne_lng),
                southwest=Coordinates(latitude=sw_lat, longitude=sw_lng)
            )
        
        # Build search filters
        # Normalize list-like params that might arrive as scalar
        pt_list = []
        if property_types:
            if isinstance(property_types, list):
                pt_list = [p.strip() for p in property_types if isinstance(p, str) and p.strip()]
            else:
                pt_list = [str(property_types).strip()]
        feat_list = []
        # include single 'feature' alias if present
        incoming_features = []
        if features:
            incoming_features.extend(features if isinstance(features, list) else [features])
        if feature:
            incoming_features.append(feature)
        feat_list = [f.strip() for f in incoming_features if isinstance(f, str) and f.strip()]

        # Debug log incoming and normalized filters
        settings = get_settings()
        if settings.debug:
            logger.info({
                "incoming_query": {
                    "property_types": property_types,
                    "min_price": min_price,
                    "max_price": max_price,
                    "city": city,
                    "state": state,
                    "features": features,
                    "feature": feature,
                },
                "normalized": {"property_types": pt_list, "features": feat_list},
            })

        filters = PropertySearchFilters(
            bounds=bounds,
            property_types=pt_list,
            min_price=min_price,
            max_price=max_price,
            min_bedrooms=min_bedrooms,
            max_bedrooms=max_bedrooms,
            min_bathrooms=min_bathrooms,
            max_bathrooms=max_bathrooms,
            min_square_feet=min_square_feet,
            max_square_feet=max_square_feet,
            city=city,
            state=state,
            features=feat_list or None,
            status=status or ["available"]
        )
        
        properties = await property_service.search_properties(filters)
        logger.info(f"Property search returned {len(properties)} results")
        return properties
        
    except Exception as e:
        logger.error(f"Error searching properties: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search properties"
        )

@router.get("/{property_id}", response_model=Property)
async def get_property_by_id(
    property_id: str,
    property_service: PropertyService = Depends(get_property_service_dep)
):
    """Get property by ID"""
    try:
        print(f"DEBUG: GET route called with property_id: {property_id}")
        logger.info(f"GET route called with property_id: {property_id}")
        
        property = await property_service.get_property_by_id(property_id)
        print(f"DEBUG: Property service returned: {property is not None}")
        
        if not property:
            print(f"DEBUG: Property not found for ID: {property_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        return property
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Exception in GET route: {e}")
        logger.error(f"Error retrieving property {property_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve property"
        )

@router.put("/{property_id}", response_model=Property)
async def update_property(
    property_id: str,
    property_update: PropertyUpdate,
    current_user: User = Depends(get_current_agent_or_admin_user),
    property_service: PropertyService = Depends(get_property_service_dep)
):
    """Update a property (agents can only update their own properties)"""
    try:
        logger.info(f"UPDATE ROUTE: Received property_id: {property_id}")
        logger.info(f"UPDATE ROUTE: User: {current_user.email}")
        property = await property_service.update_property(property_id, property_update, current_user)
        logger.info(f"Property updated: {property_id} by user {current_user.id}")
        return property
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating property {property_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update property"
        )

@router.delete("/{property_id}", response_model=APIResponse)
async def delete_property(
    property_id: str,
    current_user: User = Depends(get_current_agent_or_admin_user),
    property_service: PropertyService = Depends(get_property_service_dep)
):
    """Delete a property (agents can only delete their own properties)"""
    try:
        success = await property_service.delete_property(property_id, current_user)
        if success:
            logger.info(f"Property deleted: {property_id} by user {current_user.id}")
            return APIResponse(
                success=True,
                message="Property successfully deleted"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete property"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting property {property_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete property"
        )

@router.get("/agent/{agent_id}", response_model=List[Property])
async def get_agent_properties(
    agent_id: str,
    property_service: PropertyService = Depends(get_property_service_dep)
):
    """Get all properties for a specific agent"""
    try:
        properties = await property_service.get_properties_by_agent(agent_id)
        return properties
        
    except Exception as e:
        logger.error(f"Error retrieving properties for agent {agent_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve agent properties"
        )

@router.get("/{property_id}/nearby", response_model=List[Property])
async def get_nearby_properties(
    property_id: str,
    radius_miles: float = Query(5.0, gt=0, le=50, description="Search radius in miles"),
    limit: int = Query(20, gt=0, le=100, description="Maximum number of properties"),
    property_service: PropertyService = Depends(get_property_service_dep)
):
    """Get properties near a specific property"""
    try:
        # First get the target property to get its coordinates
        target_property = await property_service.get_property_by_id(property_id)
        if not target_property:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        # Find nearby properties
        nearby_properties = await property_service.get_nearby_properties(
            target_property.coordinates, radius_miles, limit
        )
        
        # Exclude the target property from results
        nearby_properties = [p for p in nearby_properties if p.id != property_id]
        
        return nearby_properties
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding nearby properties for {property_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to find nearby properties"
        )

@router.get("/my/properties", response_model=List[Property])
async def get_my_properties(
    current_user: User = Depends(get_current_agent_or_admin_user),
    property_service: PropertyService = Depends(get_property_service_dep)
):
    """Get current user's properties (for agents)"""
    try:
        properties = await property_service.get_properties_by_agent(current_user.id)
        return properties
        
    except Exception as e:
        logger.error(f"Error retrieving properties for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve your properties"
        )