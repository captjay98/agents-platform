---
name: leaflet-react
description: Interactive maps with Leaflet and React-Leaflet. Use when rendering maps, adding markers, drawing polygons, handling map events, or building location-based UIs.
---

# Leaflet — React

## Installation

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

## CSS import (required)

```ts
// In your root layout or global CSS
import 'leaflet/dist/leaflet.css'
```

## Fix default marker icons (Webpack/Vite issue)

```ts
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})
```

## Basic map

```tsx
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'

function Map({ center, zoom = 13 }: { center: [number, number]; zoom?: number }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '400px', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  )
}
```

## Markers

```tsx
import L from 'leaflet'

// Custom icon
const customIcon = L.icon({
  iconUrl: '/icons/marker.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

// Multiple markers
function MarkerLayer({ locations }: { locations: Location[] }) {
  return (
    <>
      {locations.map((loc) => (
        <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={customIcon}>
          <Popup>
            <strong>{loc.name}</strong>
            <p>{loc.address}</p>
          </Popup>
        </Marker>
      ))}
    </>
  )
}
```

## Programmatic map control

```tsx
function FlyToLocation({ position }: { position: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo(position, 15, { duration: 1.5 })
  }, [position, map])

  return null
}

// Usage inside MapContainer
<FlyToLocation position={[lat, lng]} />
```

## Click events

```tsx
import { useMapEvents } from 'react-leaflet'

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}
```

## Polygons and circles

```tsx
import { Polygon, Circle, Polyline } from 'react-leaflet'

<Polygon
  positions={[[6.5244, 3.3792], [6.5300, 3.3850], [6.5200, 3.3900]]}
  pathOptions={{ color: 'blue', fillOpacity: 0.2 }}
/>

<Circle
  center={[6.5244, 3.3792]}
  radius={500}  // meters
  pathOptions={{ color: 'red', fillOpacity: 0.1 }}
/>
```

## Tile providers

```ts
// OpenStreetMap (free)
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

// CartoDB (clean, free)
url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"

// Mapbox (requires token)
url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${token}`}
```

## Anti-patterns

- Don't render `MapContainer` in SSR — wrap in dynamic import with `ssr: false` in Next.js
- Don't forget `leaflet/dist/leaflet.css` — map renders without tiles/icons otherwise
- Don't set map height via CSS class alone — use inline `style={{ height: '...' }}`
- Don't create new `L.icon()` instances on every render — define outside component
