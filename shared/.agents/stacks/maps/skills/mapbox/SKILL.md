---
name: mapbox
description: Mapbox maps in React with mapbox-gl-js or react-map-gl. Use when rendering Mapbox maps, adding layers, handling events, or building custom map styles.
---

# Mapbox — React

## Installation

```bash
npm install mapbox-gl react-map-gl
npm install -D @types/mapbox-gl
```

## CSS import

```ts
import 'mapbox-gl/dist/mapbox-gl.css'
```

## Basic map (react-map-gl)

```tsx
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

function MapView() {
  const [viewState, setViewState] = useState({
    longitude: 3.3792,
    latitude: 6.5244,
    zoom: 12,
  })

  return (
    <Map
      {...viewState}
      onMove={(e) => setViewState(e.viewState)}
      style={{ width: '100%', height: '400px' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={MAPBOX_TOKEN}
    >
      <NavigationControl position="top-right" />
    </Map>
  )
}
```

## Markers and popups

```tsx
import { useState } from 'react'
import Map, { Marker, Popup } from 'react-map-gl'

function MapWithMarkers({ locations }: { locations: Location[] }) {
  const [selected, setSelected] = useState<Location | null>(null)

  return (
    <Map mapboxAccessToken={MAPBOX_TOKEN} /* ...viewState */ >
      {locations.map((loc) => (
        <Marker
          key={loc.id}
          longitude={loc.lng}
          latitude={loc.lat}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation()
            setSelected(loc)
          }}
        >
          <div className="w-6 h-6 bg-blue-500 rounded-full cursor-pointer" />
        </Marker>
      ))}

      {selected && (
        <Popup
          longitude={selected.lng}
          latitude={selected.lat}
          anchor="top"
          onClose={() => setSelected(null)}
        >
          <div>
            <strong>{selected.name}</strong>
            <p>{selected.address}</p>
          </div>
        </Popup>
      )}
    </Map>
  )
}
```

## GeoJSON layer (clusters, polygons)

```tsx
import Map, { Source, Layer } from 'react-map-gl'

const clusterLayer = {
  id: 'clusters',
  type: 'circle' as const,
  source: 'locations',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'],
    'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
  },
}

<Map mapboxAccessToken={MAPBOX_TOKEN} /* ...viewState */ >
  <Source
    id="locations"
    type="geojson"
    data={geojsonData}
    cluster={true}
    clusterMaxZoom={14}
    clusterRadius={50}
  >
    <Layer {...clusterLayer} />
  </Source>
</Map>
```

## Map styles

```ts
// Mapbox built-in styles
'mapbox://styles/mapbox/streets-v12'
'mapbox://styles/mapbox/satellite-streets-v12'
'mapbox://styles/mapbox/light-v11'
'mapbox://styles/mapbox/dark-v11'
'mapbox://styles/mapbox/outdoors-v12'

// Custom style from Mapbox Studio
'mapbox://styles/yourusername/your-style-id'
```

## Geocoding (search)

```ts
// Mapbox Geocoding API
async function geocode(query: string) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
    + `?access_token=${MAPBOX_TOKEN}&country=NG&limit=5`

  const res = await fetch(url)
  const data = await res.json()

  return data.features.map((f: any) => ({
    name: f.place_name,
    lng: f.center[0],
    lat: f.center[1],
  }))
}
```

## Anti-patterns

- Don't expose Mapbox token in public repos — use env variables
- Don't import `mapbox-gl` directly in SSR — use dynamic import or `react-map-gl`'s SSR mode
- Don't create new layer/source objects on every render — define outside component
- Don't skip `mapbox-gl/dist/mapbox-gl.css` — map renders without controls/styles
