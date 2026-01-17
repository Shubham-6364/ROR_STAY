import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Home, Users } from 'lucide-react';
import { Input } from './ui/input';
import { api, endpoints } from '../lib/api';

// Local filter option constants (avoid mock imports)
const PRICE_RANGES = [
  'Under ₹10,000',
  '₹10,000 - ₹20,000',
  '₹20,000 - ₹30,000',
  '₹30,000 - ₹50,000',
  '₹50,000 - ₹75,000',
  'Above ₹75,000',
];
// Fixed filter option lists per admin spec
const UI_ROOM_TYPES = ['Apartment', 'House', 'Condo'];
const UI_RESTRICTIONS = ['Only Boys', 'Only Girls', 'Family', 'Working Professionals', 'Students'];

// Map UI room type to backend enum
const mapRoomTypeToBackend = (val) => {
  const v = (val || '').toLowerCase();
  if (v === 'apartment') return 'apartment';
  if (v === 'house') return 'house';
  if (v === 'condo') return 'condo';
  return undefined;
};
// Nearby and Restrictions options will be derived from data (states and features)

export const Listings = () => {
  const [filters, setFilters] = useState({
    location: '',
    nearby: '',        // single-select
    priceRange: '',
    roomType: '',
    restrictions: '',  // single-select
  });

  const [listings, setListings] = useState([]);
  // Option catalogs (built from full dataset once)
  const [locationOptions, setLocationOptions] = useState([]);
  const [nearbyOptions, setNearbyOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [featureOptions, setFeatureOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Contact Modal State & Handlers (must be at top-level of component)
  const [contactOpen, setContactOpen] = useState(false);
  const [contactListing, setContactListing] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '', website: '' }); // 'website' is a honeypot
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  const onContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({ ...prev, [name]: value }));
  };


  const isValidPhone = (val) => {
    const digits = String(val || '').replace(/\D/g, '');
    return digits.length === 10;
  };

  const submitContact = async (e) => {
    e.preventDefault();
    if (!contactListing) return;
    setContactSubmitting(true);
    setContactError('');
    setContactSuccess('');
    try {
      // Simple rate limiting between submissions per browser
      const RATE_KEY = 'contact_last_submit';
      const RATE_LIMIT_MS = 60000; // adjust as needed (currently 60s)
      const now = Date.now();
      const last = Number(localStorage.getItem(RATE_KEY) || 0);
      if (now - last < RATE_LIMIT_MS) {
        const secs = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
        setContactError(`Please wait ${secs}s before submitting again.`);
        setContactSubmitting(false);
        return;
      }

      // Basic client validation
      const name = String(contactForm.name || '').trim();
      const email = String(contactForm.email || '').trim();
      const phone = String(contactForm.phone || '').trim();
      if (!name || !email || !phone) {
        setContactError('Please fill Name, Email and Contact No.');
        setContactSubmitting(false);
        return;
      }
      if (!isValidPhone(phone)) {
        setContactError('Please enter a valid contact number (10-13 digits).');
        setContactSubmitting(false);
        return;
      }
      // Honeypot check: if filled, treat as spam
      if (String(contactForm.website || '').trim()) {
        setContactError('Submission blocked as spam.');
        setContactSubmitting(false);
        return;
      }

      const payload = {
        name,
        email,
        phone,
        listing_id: contactListing.id,
        property_id: contactListing.id,
        message: `Inquiry for listing ${contactListing.id}${contactListing?.title ? `: ${contactListing.title}` : ''}`,
      };
      const url = endpoints.contactSubmit || '/contact/submit';
      await api.post(url, payload);
      setContactSuccess('Thanks for showing the interest, we will reach out to you soon.');
      setTimeout(() => setContactOpen(false), 1500);
      try { localStorage.setItem('contact_last_submit', String(Date.now())); } catch (_) {}
    } catch (err) {
      const data = err?.response?.data;
      let msg = err?.message || 'Failed to submit your inquiry.';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (data.detail) {
          if (typeof data.detail === 'string') msg = data.detail;
          else if (Array.isArray(data.detail)) msg = data.detail.map(d => d?.msg || JSON.stringify(d)).join('; ');
          else if (typeof data.detail === 'object') msg = data.detail.message || JSON.stringify(data.detail);
        } else if (data.message) {
          msg = data.message;
        } else {
          try { msg = JSON.stringify(data); } catch (_) {}
        }
      }
      setContactError(msg);
    } finally {
      setContactSubmitting(false);
    }
  };

  // Build catalogs from all properties (unfiltered)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(endpoints.properties);
        if (cancelled) return;
        const arr = Array.isArray(res.data) ? res.data : [];
        const types = Array.from(new Set(arr.map(it => it?.property_type).filter(Boolean))).sort();
        const featuresRaw = arr.flatMap(it => Array.isArray(it?.features) ? it.features : []);
        const nearby = Array.from(new Set(
          featuresRaw
            .filter(f => typeof f === 'string' && /^\s*nearby\s*:/i.test(f))
            .map(f => f.split(':').slice(1).join(':').trim())
            .filter(Boolean)
        )).sort();
        const locations = Array.from(new Set(
          arr.map(it => it?.address?.city).filter(Boolean)
        )).sort();
        const restrictionOptions = Array.from(new Set(
          featuresRaw
            .filter(f => typeof f === 'string' && !/^\s*(nearby|location)\s*:/i.test(f))
            .map(f => f.trim())
            .filter(Boolean)
        )).sort();
        setTypeOptions(types);
        setNearbyOptions(nearby);
        setLocationOptions(locations);
        setFeatureOptions(restrictionOptions);
      } catch (e) {
        console.error('Failed to build catalogs:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchProperties() {
      try {
        setLoading(true);
        setError('');

        // Build search params for server-side filtering
        let params = {};
        // Map priceRange to min/max for backend search
        if (filters.priceRange) {
          const map = {
            'Under ₹10,000': { max_price: 10000 },
            '₹10,000 - ₹20,000': { min_price: 10000, max_price: 20000 },
            '₹20,000 - ₹30,000': { min_price: 20000, max_price: 30000 },
            '₹30,000 - ₹50,000': { min_price: 30000, max_price: 50000 },
            '₹50,000 - ₹75,000': { min_price: 50000, max_price: 75000 },
            'Above ₹75,000': { min_price: 75000 },
          };
          Object.assign(params, map[filters.priceRange] || {});
        }
        // Location filter via backend city
        if (filters.location && String(filters.location).trim()) {
          params.city = String(filters.location).trim();
        }
        // Nearby filter via features tag 'Nearby: <value>'
        // Room type -> property_types (map UI to backend)
        if (filters.roomType && String(filters.roomType).trim()) {
          const mapped = mapRoomTypeToBackend(String(filters.roomType).trim());
          if (mapped) params.property_types = mapped;
        }
        // Combine features: Location, Nearby (server-side); Restrictions handled client-side
        const featuresParams = [];
        if (filters.nearby) featuresParams.push(`Nearby: ${filters.nearby}`);
        if (featuresParams.length) params.features = featuresParams;

        const useSearch = Object.keys(params).length > 0;
        let res;
        if (useSearch) {
          console.debug('Property search params:', params);
          try {
            res = await api.get(`${endpoints.properties}/search`, {
              params,
              paramsSerializer: (p) => {
                const usp = new URLSearchParams();
                Object.entries(p).forEach(([k, v]) => {
                  if (Array.isArray(v)) v.forEach((val) => usp.append(k, val));
                  else if (v !== undefined && v !== null) usp.append(k, v);
                });
                return usp.toString();
              },
            });
          } catch (searchErr) {
            console.error('Search request failed:', searchErr);
            // If search fails, try to get all properties and filter client-side
            // This provides a better user experience than showing an error
            res = await api.get(endpoints.properties);
            console.log('Falling back to client-side filtering');
          }
        } else {
          res = await api.get(endpoints.properties);
        }

        if (!cancelled) {
          const arr = Array.isArray(res.data) ? res.data : [];
          setListings(arr);
        }
      } catch (e) {
        console.error('Failed to load properties:', e);
        if (!cancelled) {
          setError('Failed to load properties. Please try again.');
          setListings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProperties();
    return () => {
      cancelled = true;
    };
  }, [filters.priceRange, filters.location, filters.nearby, filters.roomType, filters.restrictions]);

  // Apply client-side fallback for all filters in case backend filtering is unavailable
  const filteredListings = useMemo(() => {
    let arr = listings;
    
    // Price range filter (client-side fallback)
    if (filters.priceRange) {
      const map = {
        'Under ₹10,000': (price) => price < 10000,
        '₹10,000 - ₹20,000': (price) => price >= 10000 && price <= 20000,
        '₹20,000 - ₹30,000': (price) => price >= 20000 && price <= 30000,
        '₹30,000 - ₹50,000': (price) => price >= 30000 && price <= 50000,
        '₹50,000 - ₹75,000': (price) => price >= 50000 && price <= 75000,
        'Above ₹75,000': (price) => price > 75000,
      };
      const priceFilter = map[filters.priceRange];
      if (priceFilter) {
        arr = arr.filter(it => {
          const price = typeof it.price === 'number' ? it.price : Number(it.price) || 0;
          return priceFilter(price);
        });
      }
    }
    
    // Room type filter (client-side fallback)
    if (filters.roomType && String(filters.roomType).trim()) {
      const roomType = String(filters.roomType).trim().toLowerCase();
      arr = arr.filter(it => {
        const propertyType = (it.property_type || '').toLowerCase();
        if (roomType === 'apartment') return propertyType === 'apartment';
        if (roomType === 'house') return propertyType === 'house';
        if (roomType === 'condo') return propertyType === 'condo';
        return false;
      });
    }
    
    // Location filter (client-side fallback)
    if (filters.location && String(filters.location).trim()) {
      const location = String(filters.location).trim().toLowerCase();
      arr = arr.filter(it => {
        const city = (it.address?.city || '').toLowerCase();
        return city.includes(location);
      });
    }
    
    // Restrictions (exact case-insensitive match)
    if (filters.restrictions && String(filters.restrictions).trim()) {
      const r = String(filters.restrictions).trim().toLowerCase();
      arr = arr.filter(it => Array.isArray(it?.features) && it.features.some(f => String(f).toLowerCase() === r));
    }
    
    // Nearby (match "Nearby: <value>" tag case-insensitively)
    if (filters.nearby && String(filters.nearby).trim()) {
      const nb = String(filters.nearby).trim().toLowerCase();
      arr = arr.filter(it => Array.isArray(it?.features) && it.features.some(f => {
        const s = String(f).toLowerCase();
        return s.startsWith('nearby:') && s.includes(nb);
      }));
    }
    
    return arr;
  }, [listings, filters.priceRange, filters.roomType, filters.location, filters.restrictions, filters.nearby]);

  // Pagination: show max 6 per page
  const ITEMS_PER_PAGE = 6;
  const [page, setPage] = useState(1);
  
  // Image carousel state - track current image index for each listing
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const totalPages = Math.max(1, Math.ceil(filteredListings.length / ITEMS_PER_PAGE));
  const currentPageListings = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredListings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredListings, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.priceRange, filters.location, filters.nearby, filters.roomType, filters.restrictions]);

  // Swipe handlers for mobile
  const touchStartXRef = useRef(null);
  const onTouchStart = (e) => {
    touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };
  const onTouchEnd = (e) => {
    const startX = touchStartXRef.current;
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    if (startX == null || endX == null) return;
    const delta = endX - startX;
    const THRESHOLD = 50; // px
    if (delta <= -THRESHOLD && page < totalPages) {
      setPage(p => Math.min(totalPages, p + 1));
    } else if (delta >= THRESHOLD && page > 1) {
      setPage(p => Math.max(1, p - 1));
    }
  };

  const handleContactClick = (listing) => {
    setContactListing(listing);
    setContactForm({ name: '', email: '', phone: '', message: '', website: '' });
    setContactError('');
    setContactSuccess('');
    setContactOpen(true);
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      nearby: '',
      priceRange: '',
      roomType: '',
      restrictions: ''
    });
  };

  // Image navigation functions
  const nextImage = (listingId, totalImages) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) + 1) % totalImages
    }));
  };

  const prevImage = (listingId, totalImages) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const setImageIndex = (listingId, index) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [listingId]: index
    }));
  };

  return (
    <section id="listings" className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Available Properties
          </h2>
          <p className="text-xl text-slate-600">
            Find your perfect stay from our verified listings
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Filter Properties:</h3>
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="text-slate-600 hover:text-slate-900"
            >
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={filters.location} onValueChange={(value) => setFilters({...filters, location: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.nearby} onValueChange={(value) => setFilters({...filters, nearby: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Nearby" />
              </SelectTrigger>
              <SelectContent>
                {nearbyOptions.map(nb => (
                  <SelectItem key={nb} value={nb}>{nb}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.priceRange} onValueChange={(value) => setFilters({...filters, priceRange: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map(range => (
                  <SelectItem key={range} value={range}>{range}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.roomType} onValueChange={(value) => setFilters({...filters, roomType: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Room Type" />
              </SelectTrigger>
              <SelectContent>
                {UI_ROOM_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.restrictions} onValueChange={(value) => setFilters({...filters, restrictions: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Restrictions" />
              </SelectTrigger>
              <SelectContent>
                {UI_RESTRICTIONS.map(restriction => (
                  <SelectItem key={restriction} value={restriction}>{restriction}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-slate-600">
            {loading ? 'Loading properties...' : error ? error : `Showing ${filteredListings.length} properties`}
          </p>
        </div>

        {/* Listings Grid (paginated, swipeable) */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {currentPageListings.map(listing => (
            <Card key={listing.id} className="bg-white shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200 hover:border-blue-200 overflow-hidden group">
              <CardHeader className="p-0">
                <div className="relative overflow-hidden">
                  {(() => {
                    const images = listing.images && listing.images.length > 0 
                      ? listing.images 
                      : ['https://via.placeholder.com/600x400?text=Property'];
                    const currentIndex = currentImageIndex[listing.id] || 0;
                    const currentImage = images[currentIndex] || images[0];
                    
                    return (
                      <>
                        <img
                          src={currentImage}
                          alt={`${listing.title || 'Property'} - Image ${currentIndex + 1}`}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        
                        {/* Image Navigation - only show if multiple images */}
                        {images.length > 1 && (
                          <>
                            {/* Previous Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                prevImage(listing.id, images.length);
                              }}
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                            >
                              ‹
                            </button>
                            
                            {/* Next Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                nextImage(listing.id, images.length);
                              }}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                            >
                              ›
                            </button>
                            
                            {/* Image Dots Indicator */}
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                              {images.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setImageIndex(listing.id, index);
                                  }}
                                  className={`w-2 h-2 rounded-full transition-colors ${
                                    index === currentIndex 
                                      ? 'bg-white' 
                                      : 'bg-white/50 hover:bg-white/75'
                                  }`}
                                />
                              ))}
                            </div>
                            
                            {/* Image Counter */}
                            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                              {currentIndex + 1}/{images.length}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                  
                  {/* Price Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-blue-600 text-white px-3 py-1 text-sm font-semibold">
                      {(() => {
                        const v = typeof listing.price === 'number' ? listing.price : Number(listing.price) || 0;
                        return `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)}/month`;
                      })()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600 font-medium">{(listing?.address?.city || 'Unknown City') + (listing?.address?.state ? `, ${listing.address.state}` : '')}</span>
                </div>
                {/* Address hidden, and coordinates also hidden as per request */}
                
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Home className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">{listing.property_type || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-slate-700">{listing.status || 'available'}</span>
                  </div>
                </div>
                
                <p className="text-slate-600 text-sm mb-3 leading-relaxed">
                  {listing.description || listing.title}
                </p>
                
                <div className="text-xs text-slate-500">
                  ID: {listing.id}
                </div>
              </CardContent>
              
              <CardFooter className="p-6 pt-0">
                <Button 
                  onClick={() => handleContactClick(listing)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Contact for Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <div className="text-slate-600 text-sm">Page {page} of {totalPages}</div>
          <Button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>

        {/* No Results */}
        {!loading && !error && filteredListings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <Home className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No properties found</h3>
            <p className="text-slate-600 mb-4">Try adjusting your filters or browse all properties</p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        )}

        {/* Contact Modal */}
        {contactOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={() => setContactOpen(false)} />
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-1">Contact for Details</h3>
              <p className="text-sm text-slate-600 mb-4">
                {(contactListing?.title || contactListing?.description || 'Selected Property')} 
                {contactListing?.address?.city ? ` • ${contactListing.address.city}` : ''}
              </p>

              {contactError && <div className="mb-3 text-sm text-red-600">{contactError}</div>}
              {contactSuccess && <div className="mb-3 text-sm text-green-700">{contactSuccess}</div>}

              <form onSubmit={submitContact} className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input name="name" value={contactForm.name} onChange={onContactChange} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" name="email" value={contactForm.email} onChange={onContactChange} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input type="tel" name="phone" value={contactForm.phone} onChange={onContactChange} />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <textarea 
                    name="message" 
                    value={contactForm.message} 
                    onChange={onContactChange} 
                    className="w-full p-2 border rounded-md" 
                    rows="3" 
                    required 
                  />
                </div>
                <Button type="submit" disabled={contactSubmitting} className="w-full">
                  {contactSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};