---
name: google-maps-flutter
description: Google Maps integration in Flutter. Use when rendering maps, adding markers, handling map events, showing user location, or drawing routes.
---

# Google Maps — Flutter

## pubspec.yaml

```yaml
dependencies:
  google_maps_flutter: ^2.5.0
  geolocator: ^14.0.0
  geocoding: ^4.0.0
```

## API key setup

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest>
  <application>
    <meta-data
      android:name="com.google.android.geo.API_KEY"
      android:value="YOUR_GOOGLE_MAPS_API_KEY" />
  </application>
</manifest>
```

```xml
<!-- ios/Runner/AppDelegate.swift -->
import GoogleMaps
GMSServices.provideAPIKey("YOUR_GOOGLE_MAPS_API_KEY")
```

## Basic map widget

```dart
import 'package:google_maps_flutter/google_maps_flutter.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  GoogleMapController? _controller;
  final Set<Marker> _markers = {};

  static const _initialPosition = CameraPosition(
    target: LatLng(6.5244, 3.3792),  // Lagos
    zoom: 12,
  );

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: _initialPosition,
      onMapCreated: (controller) => _controller = controller,
      markers: _markers,
      myLocationEnabled: true,
      myLocationButtonEnabled: true,
      mapType: MapType.normal,
      onTap: _onMapTap,
    );
  }

  void _onMapTap(LatLng position) {
    setState(() {
      _markers.add(Marker(
        markerId: MarkerId(position.toString()),
        position: position,
        infoWindow: InfoWindow(
          title: 'Selected Location',
          snippet: '${position.latitude.toStringAsFixed(4)}, ${position.longitude.toStringAsFixed(4)}',
        ),
      ));
    });
  }
}
```

## Custom markers

```dart
// From asset
final BitmapDescriptor customIcon = await BitmapDescriptor.fromAssetImage(
  const ImageConfiguration(size: Size(48, 48)),
  'assets/icons/marker.png',
);

final marker = Marker(
  markerId: const MarkerId('custom'),
  position: const LatLng(6.5244, 3.3792),
  icon: customIcon,
  infoWindow: const InfoWindow(title: 'Custom Marker'),
);
```

## User location with Geolocator

```dart
import 'package:geolocator/geolocator.dart';

Future<Position?> getCurrentLocation() async {
  bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) return null;

  LocationPermission permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied) return null;
  }

  return Geolocator.getCurrentPosition(
    desiredAccuracy: LocationAccuracy.high,
  );
}

// Move camera to user location
Future<void> goToMyLocation() async {
  final position = await getCurrentLocation();
  if (position == null || _controller == null) return;

  await _controller!.animateCamera(
    CameraUpdate.newCameraPosition(
      CameraPosition(
        target: LatLng(position.latitude, position.longitude),
        zoom: 15,
      ),
    ),
  );
}
```

## Polylines (routes)

```dart
final Set<Polyline> _polylines = {
  Polyline(
    polylineId: const PolylineId('route'),
    points: routePoints,  // List<LatLng>
    color: Colors.blue,
    width: 4,
  ),
};

GoogleMap(
  polylines: _polylines,
  // ...
)
```

## Riverpod integration

```dart
final mapControllerProvider = StateProvider<GoogleMapController?>((ref) => null);

// In widget
ref.read(mapControllerProvider.notifier).state = controller;

// To animate camera from anywhere
final controller = ref.read(mapControllerProvider);
await controller?.animateCamera(CameraUpdate.newLatLng(position));
```

## Anti-patterns

- Don't store API key in source code — use `--dart-define` or a secrets file excluded from git
- Don't create markers in `build()` — compute them outside and pass as `Set<Marker>`
- Don't forget location permissions in `AndroidManifest.xml` and `Info.plist`
- Don't use `GoogleMap` without a fixed height container — it needs bounded constraints
