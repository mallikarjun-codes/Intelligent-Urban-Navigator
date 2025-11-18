import requests

def get_safety_score(lat, lng):
    """
    Calculates a 'Safety Score' (0-100) based on street lighting and amenities.
    Uses OpenStreetMap (Overpass API).
    """
    overpass_url = "http://overpass-api.de/api/interpreter"
    
    # Query: Find street lamps and police stations within 500m radius
    overpass_query = f"""
    [out:json];
    (
      node["highway"="street_lamp"](around:500, {lat}, {lng});
      node["amenity"="police"](around:500, {lat}, {lng});
    );
    out count;
    """
    
    try:
        response = requests.get(overpass_url, params={'data': overpass_query})
        data = response.json()
        
        # Get the count of elements found
        element_count = int(data['elements'][0]['tags']['total'])
        
        # Algorithm:
        # 0 lights = 20 score (Dark/Risky)
        # 50+ lights = 90 score (Well lit)
        # Police station adds +10 bonus
        
        score = min(20 + (element_count * 1.5), 95)
        
        return {
            "score": int(score),
            "details": f"Found {element_count} street lights/safety points nearby."
        }
    except Exception as e:
        print(f"Safety API Error: {e}")
        return {"score": 0, "details": "Could not calculate safety data."}