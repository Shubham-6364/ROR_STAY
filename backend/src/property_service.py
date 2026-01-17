from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
from models import (
    Property, PropertyCreate, PropertyUpdate, PropertySearchFilters, 
    MapBounds, Coordinates, User, UserRole, generate_id, get_current_timestamp
)
from maps_service import GoogleMapsService
import logging
import math

logger = logging.getLogger(__name__)

class PropertyService:
    def __init__(self, db: AsyncIOMotorDatabase, maps_service: GoogleMapsService):
        self.db = db
        self.maps_service = maps_service
    
    async def create_property(self, property_data: PropertyCreate, current_user: User) -> Property:
        """
        Create a new property with automatic geocoding
        
        Args:
            property_data: Property data to create
            current_user: Current authenticated user
            
        Returns:
            Created property
        """
        try:
            # Check permissions - only admins and agents can create properties
            if current_user.role not in [UserRole.ADMIN, UserRole.AGENT]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins and agents can create properties"
                )
            
            # If coordinates not provided, geocode the address
            if not property_data.coordinates:
                coordinates = await self.maps_service.geocode_address(
                    property_data.address.full_address
                )
                if not coordinates:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST, 
                        detail="Unable to geocode the provided address"
                    )
            else:
                coordinates = property_data.coordinates
            
            # Set agent_id to current user if they're an agent
            agent_id = property_data.agent_id
            if current_user.role == UserRole.AGENT:
                agent_id = current_user.id
            
            # Create property document
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
                "images": property_data.images or [],
                "address": property_data.address.dict() if hasattr(property_data.address, 'dict') else property_data.address,
                "coordinates": coordinates.dict() if hasattr(coordinates, 'dict') else coordinates,
                # Contact information fields
                "contact_phone": property_data.contact_phone,
                "alternative_phone": property_data.alternative_phone,
                "contact_email": property_data.contact_email,
                "agent_id": agent_id,
                "created_at": current_time,
                "updated_at": current_time
            }
            
            # Insert into database
            result = await self.db.properties.insert_one(property_doc)
            
            if result.inserted_id:
                # Return the created property
                return Property(**property_doc)
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create property"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating property: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create property"
            )
    
    async def get_property_by_id(self, property_id: str) -> Optional[Property]:
        """
        Get property by ID
        
        Args:
            property_id: Property ID (can be either the 'id' field or MongoDB '_id')
            
        Returns:
            Property object or None if not found
        """
        try:
            from bson import ObjectId
            property_doc = None
            
            # First try to search by the 'id' field
            property_doc = await self.db.properties.find_one({"id": property_id})
            
            # If not found by id field and property_id looks like an ObjectId, try searching by _id
            if not property_doc and ObjectId.is_valid(property_id):
                try:
                    obj_id = ObjectId(property_id)
                    property_doc = await self.db.properties.find_one({"_id": obj_id})
                except Exception as e:
                    logger.error(f"ObjectId search error: {e}")
            
            if property_doc:
                # Convert MongoDB document to Property model
                # Always use the original id field if it exists, otherwise use _id
                if "id" in property_doc and property_doc["id"]:
                    # Keep the original id and remove _id
                    property_doc.pop("_id", None)
                else:
                    # Use _id as id if no custom id exists
                    property_doc["id"] = str(property_doc.pop("_id"))
                
                # Convert nested dictionaries back to models
                if "coordinates" in property_doc and property_doc["coordinates"]:
                    property_doc["coordinates"] = Coordinates(**property_doc["coordinates"])
                
                return Property(**property_doc)
            return None
            
        except Exception as e:
            logger.error(f"Error fetching property by ID {property_id}: {e}")
            return None
    
    async def update_property(
        self, 
        property_id: str, 
        property_update: PropertyUpdate, 
        current_user: User
    ) -> Property:
        """
        Update an existing property
        
        Args:
            property_id: Property ID to update
            property_update: Updated property data
            current_user: Current authenticated user
            
        Returns:
            Updated property
        """
        try:
            # Get existing property
            existing_property = await self.get_property_by_id(property_id)
            if not existing_property:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Property not found"
                )
            
            # Check permissions
            if current_user.role == UserRole.AGENT and existing_property.agent_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update your own properties"
                )
            elif current_user.role not in [UserRole.ADMIN, UserRole.AGENT]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins and agents can update properties"
                )
            
            # Prepare update data
            update_data = {}
            update_fields = property_update.dict(exclude_unset=True)
            
            for field, value in update_fields.items():
                if value is not None:
                    if field == "address":
                        # Handle both dict and Pydantic model
                        if hasattr(value, 'dict'):
                            update_data["address"] = value.dict()
                            # If address changed, re-geocode
                            new_coordinates = await self.maps_service.geocode_address(value.full_address)
                            if new_coordinates:
                                update_data["coordinates"] = new_coordinates.dict()
                        else:
                            # value is already a dict
                            update_data["address"] = value
                    elif field == "coordinates":
                        # Handle both dict and Pydantic model
                        if hasattr(value, 'dict'):
                            update_data["coordinates"] = value.dict()
                        else:
                            # value is already a dict
                            update_data["coordinates"] = value
                    else:
                        update_data[field] = value
            
            # Add updated timestamp
            update_data["updated_at"] = get_current_timestamp()
            
            # Update in database
            from bson import ObjectId
            
            # Try by id field first
            result = await self.db.properties.update_one(
                {"id": property_id},
                {"$set": update_data}
            )
            
            # If not found by id field and looks like ObjectId, try by _id
            if result.matched_count == 0 and ObjectId.is_valid(property_id):
                try:
                    result = await self.db.properties.update_one(
                        {"_id": ObjectId(property_id)},
                        {"$set": update_data}
                    )
                except Exception:
                    pass
            
            if result.matched_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Property not found for update"
                )
            
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No changes were made to the property"
                )
            
            # Return updated property
            updated_property = await self.get_property_by_id(property_id)
            if not updated_property:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve updated property"
                )
            
            return updated_property
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating property {property_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update property"
            )
    
    async def delete_property(self, property_id: str, current_user: User) -> bool:
        """
        Delete a property
        
        Args:
            property_id: Property ID to delete
            current_user: Current authenticated user
            
        Returns:
            True if deleted successfully
        """
        try:
            # Get existing property
            existing_property = await self.get_property_by_id(property_id)
            if not existing_property:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Property not found"
                )
            
            # Check permissions
            if current_user.role == UserRole.AGENT and existing_property.agent_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only delete your own properties"
                )
            elif current_user.role not in [UserRole.ADMIN, UserRole.AGENT]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins and agents can delete properties"
                )
            
            # Delete from database
            from bson import ObjectId
            
            # Try by id field first
            result = await self.db.properties.delete_one({"id": property_id})
            
            # If not found by id field and looks like ObjectId, try by _id
            if result.deleted_count == 0 and ObjectId.is_valid(property_id):
                try:
                    result = await self.db.properties.delete_one({"_id": ObjectId(property_id)})
                except Exception:
                    pass
            
            if result.deleted_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to delete property"
                )
            
            logger.info(f"Property {property_id} deleted by user {current_user.id}")
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting property {property_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete property"
            )
    
    async def search_properties(self, filters: PropertySearchFilters) -> List[Property]:
        """
        Search properties based on filters
        
        Args:
            filters: Search filters
            
        Returns:
            List of matching properties
        """
        try:
            # Build MongoDB query
            query = {}
            
            # Apply map bounds filter if provided
            if filters.bounds:
                query["coordinates.latitude"] = {
                    "$gte": filters.bounds.southwest.latitude,
                    "$lte": filters.bounds.northeast.latitude
                }
                query["coordinates.longitude"] = {
                    "$gte": filters.bounds.southwest.longitude,
                    "$lte": filters.bounds.northeast.longitude
                }
            
            # Apply property type filter
            if filters.property_types:
                query["property_type"] = {"$in": filters.property_types}
            
            # Apply price filters
            if filters.min_price or filters.max_price:
                price_query = {}
                if filters.min_price:
                    price_query["$gte"] = filters.min_price
                if filters.max_price:
                    price_query["$lte"] = filters.max_price
                query["price"] = price_query
            
            # Apply bedroom filters
            if filters.min_bedrooms or filters.max_bedrooms:
                bedroom_query = {}
                if filters.min_bedrooms:
                    bedroom_query["$gte"] = filters.min_bedrooms
                if filters.max_bedrooms:
                    bedroom_query["$lte"] = filters.max_bedrooms
                query["bedrooms"] = bedroom_query
            
            # Apply bathroom filters
            if filters.min_bathrooms or filters.max_bathrooms:
                bathroom_query = {}
                if filters.min_bathrooms:
                    bathroom_query["$gte"] = filters.min_bathrooms
                if filters.max_bathrooms:
                    bathroom_query["$lte"] = filters.max_bathrooms
                query["bathrooms"] = bathroom_query

            # Apply features (require all), case-insensitive exact match
            if getattr(filters, "features", None):
                feat_vals = filters.features
                if not isinstance(feat_vals, list):
                    feat_vals = [feat_vals]
                try:
                    import re
                    regex_list = [{"$regex": f"^{re.escape(str(v))}$", "$options": "i"} for v in feat_vals if v is not None]
                    if regex_list:
                        query["features"] = {"$all": regex_list}
                except Exception:
                    # Fallback to direct $all
                    query["features"] = {"$all": [str(v) for v in feat_vals if v is not None]}

            # Apply square feet filters
            if filters.min_square_feet or filters.max_square_feet:
                sqft_query = {}
                if filters.min_square_feet:
                    sqft_query["$gte"] = filters.min_square_feet
                if filters.max_square_feet:
                    sqft_query["$lte"] = filters.max_square_feet
                query["square_feet"] = sqft_query

            # Apply status filter
            if filters.status:
                query["status"] = {"$in": filters.status}

            # Apply address filters (case-insensitive exact match)
            if getattr(filters, "city", None):
                try:
                    import re
                    city_pattern = f"^{re.escape(filters.city)}$"
                    query["address.city"] = {"$regex": city_pattern, "$options": "i"}
                except Exception:
                    query["address.city"] = filters.city
            if getattr(filters, "state", None):
                try:
                    import re
                    state_pattern = f"^{re.escape(filters.state)}$"
                    query["address.state"] = {"$regex": state_pattern, "$options": "i"}
                except Exception:
                    query["address.state"] = filters.state

            cursor = self.db.properties.find(query).limit(1000)  # Reasonable limit
            properties: List[Property] = []
            
            async for property_doc in cursor:
                try:
                    # Convert MongoDB document to Property model
                    # Debug what we have
                    original_id = property_doc.get("id")
                    has_custom_id = "id" in property_doc and property_doc["id"]
                    print(f"DEBUG SEARCH: has_custom_id={has_custom_id}, original_id={original_id}")
                    
                    # Always use the original id field if it exists, otherwise use _id
                    if "id" in property_doc and property_doc["id"]:
                        # Keep the original id and remove _id
                        property_doc.pop("_id", None)
                        print(f"DEBUG SEARCH: Keeping custom ID: {property_doc['id']}")
                    else:
                        # Use _id as id if no custom id exists
                        property_doc["id"] = str(property_doc.pop("_id"))
                        print(f"DEBUG SEARCH: Using ObjectId: {property_doc['id']}")
                    
                    if "coordinates" in property_doc and property_doc["coordinates"]:
                        property_doc["coordinates"] = Coordinates(**property_doc["coordinates"])
                    
                    properties.append(Property(**property_doc))
                except Exception as e:
                    logger.warning(f"Error processing property document: {e}")
                    continue

            # If no results and features were used, retry with relaxed contains match
            if not properties and getattr(filters, "features", None):
                try:
                    import re
                    relaxed = query.copy()
                    feats = filters.features if isinstance(filters.features, list) else [filters.features]
                    regex_list = [{"$regex": re.escape(str(v)), "$options": "i"} for v in feats if v is not None]
                    if regex_list:
                        relaxed["features"] = {"$all": regex_list}
                        properties = []
                        async for property_doc in self.db.properties.find(relaxed).limit(1000):
                            try:
                                # Always use the original id field if it exists, otherwise use _id
                                if "id" in property_doc and property_doc["id"]:
                                    # Keep the original id and remove _id
                                    property_doc.pop("_id", None)
                                else:
                                    # Use _id as id if no custom id exists
                                    property_doc["id"] = str(property_doc.pop("_id"))
                                if "coordinates" in property_doc and property_doc["coordinates"]:
                                    property_doc["coordinates"] = Coordinates(**property_doc["coordinates"])
                                properties.append(Property(**property_doc))
                            except Exception as e:
                                logger.warning(f"Error processing property document (relaxed): {e}")
                                continue
                except Exception as e:
                    logger.warning(f"Relaxed features retry failed: {e}")

            logger.info(f"Found {len(properties)} properties matching filters")
            return properties
            
        except Exception as e:
            logger.error(f"Error searching properties: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to search properties"
            )
    
    async def get_properties_by_agent(self, agent_id: str) -> List[Property]:
        """
        Get all properties for a specific agent
        
        Args:
            agent_id: Agent's user ID
            
        Returns:
            List of agent's properties
        """
        try:
            properties = []
            cursor = self.db.properties.find({"agent_id": agent_id})
            
            async for property_doc in cursor:
                try:
                    # Convert MongoDB document to Property model
                    # Always use the original id field if it exists, otherwise use _id
                    if "id" in property_doc and property_doc["id"]:
                        # Keep the original id and remove _id
                        property_doc.pop("_id", None)
                    else:
                        # Use _id as id if no custom id exists
                        property_doc["id"] = str(property_doc.pop("_id"))
                    
                    property_doc["coordinates"] = Coordinates(**property_doc["coordinates"])
                    
                    properties.append(Property(**property_doc))
                except Exception as e:
                    logger.warning(f"Error processing property document: {e}")
                    continue
            
            logger.info(f"Found {len(properties)} properties for agent {agent_id}")
            return properties
            
        except Exception as e:
            logger.error(f"Error fetching properties for agent {agent_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch agent properties"
            )
    
    async def get_nearby_properties(
        self, 
        coordinates: Coordinates, 
        radius_miles: float = 5.0,
        limit: int = 50
    ) -> List[Property]:
        """
        Get properties within a certain radius of coordinates
        
        Args:
            coordinates: Center coordinates
            radius_miles: Search radius in miles
            limit: Maximum number of properties to return
            
        Returns:
            List of nearby properties
        """
        try:
            # Calculate approximate bounding box (rough conversion)
            lat_delta = radius_miles / 69.0  # Approximate miles per degree latitude
            lng_delta = radius_miles / (69.0 * abs(math.cos(math.radians(coordinates.latitude))))
            
            bounds = MapBounds(
                southwest=Coordinates(
                    latitude=coordinates.latitude - lat_delta,
                    longitude=coordinates.longitude - lng_delta
                ),
                northeast=Coordinates(
                    latitude=coordinates.latitude + lat_delta,
                    longitude=coordinates.longitude + lng_delta
                )
            )
            
            # Use search with bounds
            filters = PropertySearchFilters(bounds=bounds)
            candidate_properties = await self.search_properties(filters)
            
            # Filter by exact radius using maps service
            nearby_properties = []
            for prop in candidate_properties:
                distance = await self.maps_service.calculate_distance(coordinates, prop.coordinates)
                if distance <= radius_miles:
                    nearby_properties.append(prop)
                
                if len(nearby_properties) >= limit:
                    break
            
            logger.info(f"Found {len(nearby_properties)} properties within {radius_miles} miles")
            return nearby_properties
            
        except Exception as e:
            logger.error(f"Error finding nearby properties: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to find nearby properties"
            )

# Dependency function
def get_property_service(
    db: AsyncIOMotorDatabase,
    maps_service: GoogleMapsService
) -> PropertyService:
    return PropertyService(db, maps_service)