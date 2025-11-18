import requests

lat = 15.87
lng = 74.5
overpass_query = f"""
[out:json];
(
  node["highway"="street_lamp"](around:500, {lat}, {lng});
  node["amenity"="police"](around:500, {lat}, {lng});
);
out count;
"""

resp = requests.get("https://overpass-api.de/api/interpreter", params={"data": overpass_query})
print(resp.status_code)
print(resp.text[:400])

