---
name: google-maps-api
description: Google Maps Platform server-side APIs — Geocoding, Places, Directions, Distance Matrix. Use when geocoding addresses, calculating routes/distances, searching places, or validating locations in a backend service.
---

# Google Maps API — Server-side (Node.js / NestJS)

## Installation

```bash
npm install @googlemaps/google-maps-services-js
```

## Client setup

```ts
import { Client, TravelMode, UnitSystem } from '@googlemaps/google-maps-services-js'

const mapsClient = new Client({})
const API_KEY = process.env.GOOGLE_MAPS_API_KEY
```

## Geocoding (address → coordinates)

```ts
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const response = await mapsClient.geocode({
    params: {
      address,
      key: API_KEY,
      region: 'ng',  // bias results to Nigeria
    },
  })

  const result = response.data.results[0]
  if (!result) return null

  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
  }
}
```

## Reverse geocoding (coordinates → address)

```ts
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const response = await mapsClient.reverseGeocode({
    params: {
      latlng: { lat, lng },
      key: API_KEY,
    },
  })

  return response.data.results[0]?.formatted_address ?? null
}
```

## Distance Matrix (multiple origins/destinations)

```ts
async function getDistanceMatrix(
  origins: string[],
  destinations: string[],
): Promise<{ distance: number; duration: number }[][]> {
  const response = await mapsClient.distancematrix({
    params: {
      origins,
      destinations,
      mode: TravelMode.driving,
      units: UnitSystem.metric,
      key: API_KEY,
    },
  })

  return response.data.rows.map((row) =>
    row.elements.map((el) => ({
      distance: el.distance?.value ?? 0,  // meters
      duration: el.duration?.value ?? 0,  // seconds
    })),
  )
}
```

## Directions (route between two points)

```ts
async function getDirections(origin: string, destination: string) {
  const response = await mapsClient.directions({
    params: {
      origin,
      destination,
      mode: TravelMode.driving,
      key: API_KEY,
    },
  })

  const route = response.data.routes[0]
  if (!route) return null

  const leg = route.legs[0]
  return {
    distance: leg.distance?.value ?? 0,   // meters
    duration: leg.duration?.value ?? 0,   // seconds
    polyline: route.overview_polyline.points,
    steps: leg.steps.map((s) => s.html_instructions),
  }
}
```

## Places — Nearby Search

```ts
async function findNearbyPlaces(lat: number, lng: number, type: string, radius = 5000) {
  const response = await mapsClient.placesNearby({
    params: {
      location: { lat, lng },
      radius,
      type,  // 'restaurant', 'hospital', 'bank', etc.
      key: API_KEY,
    },
  })

  return response.data.results.map((place) => ({
    id: place.place_id,
    name: place.name,
    address: place.vicinity,
    lat: place.geometry?.location.lat,
    lng: place.geometry?.location.lng,
    rating: place.rating,
  }))
}
```

## NestJS service

```ts
@Injectable()
export class MapsService {
  private readonly client = new Client({})
  private readonly apiKey = this.config.getOrThrow('GOOGLE_MAPS_API_KEY')

  constructor(private config: ConfigService) {}

  async geocode(address: string) { /* ... */ }
  async getDistance(origin: string, destination: string) { /* ... */ }
}
```

## Caching geocoding results

```ts
// Geocoding is expensive — cache results
async function geocodeWithCache(address: string, cache: Map<string, { lat: number; lng: number }>) {
  const cached = cache.get(address)
  if (cached) return cached

  const result = await geocodeAddress(address)
  if (result) cache.set(address, result)
  return result
}
```

## Anti-patterns

- Don't call Maps API from the frontend with a server-side key — use a restricted browser key or proxy through backend
- Don't geocode on every request — cache results in DB or Redis
- Don't skip API key restrictions in Google Cloud Console — restrict by IP/referrer
- Don't use `TravelMode.driving` for all cases — consider `walking` or `transit` where appropriate
