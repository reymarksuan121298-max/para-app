import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { getCurrentCoordinates } from '../../utils/location';
import { PHILIPPINES_COORDINATES } from '../../utils/constants';
import { NearbyDriver } from '../../types';

export interface MapViewContainerProps {
  initialRegion?: { latitude: number; longitude: number; latitudeDelta?: number; longitudeDelta?: number };
  pickupCoord?: { latitude: number; longitude: number } | null;
  dropoffCoord?: { latitude: number; longitude: number } | null;
  driverCoord?: { latitude: number; longitude: number } | null;
  nearbyDrivers?: NearbyDriver[];
  showsUserLocation?: boolean;
  onRegionChangeComplete?: (region: any) => void;
  onPress?: (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => void;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export interface MapViewRef {
  animateToRegion: (region: { latitude: number; longitude: number; latitudeDelta?: number; longitudeDelta?: number }, duration?: number) => void;
  fitToCoordinates: (coordinates: Array<{ latitude: number; longitude: number }>, options?: any) => void;
}

export const MapViewContainer = forwardRef<MapViewRef, MapViewContainerProps>(
  (
    {
      initialRegion,
      pickupCoord,
      dropoffCoord,
      driverCoord,
      nearbyDrivers = [],
      showsUserLocation = true,
      onPress,
      style,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null);

    // Automatically locate user's exact position anywhere in the Philippines
    useEffect(() => {
      if (!initialRegion) {
        getCurrentCoordinates().then((coords) => {
          if (coords) {
            setUserPosition(coords);
            const js = `if (window.map) { window.map.flyTo([${coords.latitude}, ${coords.longitude}], 15); }`;
            webViewRef.current?.injectJavaScript(js);
          }
        }).catch(() => {});
      }
    }, [initialRegion]);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region) => {
        const js = `if (window.map) { window.map.flyTo([${region.latitude}, ${region.longitude}], 15); }`;
        webViewRef.current?.injectJavaScript(js);
      },
      fitToCoordinates: (coordinates) => {
        if (coordinates.length > 0) {
          const latLngs = JSON.stringify(coordinates.map((c) => [c.latitude, c.longitude]));
          const js = `if (window.map) { window.map.fitBounds(${latLngs}, { padding: [50, 50] }); }`;
          webViewRef.current?.injectJavaScript(js);
        }
      },
    }));

    // Update markers and route dynamically
    useEffect(() => {
      const updateData = {
        pickup: pickupCoord,
        dropoff: dropoffCoord,
        driver: driverCoord,
        nearby: nearbyDrivers.map((d) => ({
          id: d.driver_id,
          name: d.driver_name,
          vehicle: d.vehicle_number,
          lat: d.current_lat,
          lng: d.current_lng,
        })),
      };
      const js = `if (window.updateMapData) { window.updateMapData(${JSON.stringify(updateData)}); }`;
      webViewRef.current?.injectJavaScript(js);
    }, [pickupCoord, dropoffCoord, driverCoord, nearbyDrivers]);

    const leafletHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #F8FAFC;
          }
          .custom-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          }
          .custom-driver {
            background: #0F766E;
            border: 2px solid #FFFFFF;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            font-size: 18px;
          }
          .layer-toggle {
            position: absolute;
            top: 14px;
            right: 14px;
            z-index: 1000;
            background: #FFFFFF;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.18);
            display: flex;
            overflow: hidden;
            border: 1px solid #E2E8F0;
          }
          .layer-btn {
            border: none;
            background: transparent;
            padding: 7px 12px;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            cursor: pointer;
          }
          .layer-btn.active {
            background: #0D9488;
            color: #FFFFFF;
          }
          .route-info-card {
            position: absolute;
            bottom: 18px;
            left: 14px;
            right: 14px;
            z-index: 1000;
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(8px);
            border-radius: 12px;
            padding: 12px 16px;
            color: #FFFFFF;
            display: none;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.12);
          }
          .route-info-title {
            font-size: 11px;
            color: #94A3B8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .route-info-val {
            font-size: 16px;
            font-weight: 700;
            color: #38BDF8;
          }
        </style>
      </head>
      <body>
        <div class="layer-toggle">
          <button id="btn-streets" class="layer-btn active" onclick="switchLayer('streets')">🗺️ Map</button>
          <button id="btn-satellite" class="layer-btn" onclick="switchLayer('satellite')">🛰️ Satellite</button>
        </div>

        <div id="route-card" class="route-info-card">
          <div>
            <div class="route-info-title">Est. Road Distance</div>
            <div id="route-dist" class="route-info-val">0.0 km</div>
          </div>
          <div style="text-align: right;">
            <div class="route-info-title">Travel Time (Tricycle)</div>
            <div id="route-time" class="route-info-val">0 min</div>
          </div>
        </div>

        <div id="map"></div>
        <script>
          // Google Streets tile layer (m = standard roads/streets template)
          const googleStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
          });

          // Google Hybrid Satellite tile layer (y = satellite + labels)
          const googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
          });

          const defaultLat = ${initialRegion ? initialRegion.latitude : 12.8797};
          const defaultLng = ${initialRegion ? initialRegion.longitude : 121.7740};
          const defaultZoom = ${initialRegion ? 14 : 6};

          const map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            layers: [googleStreets]
          }).setView([defaultLat, defaultLng], defaultZoom);
          window.map = map;

          let currentLayer = 'streets';
          window.switchLayer = function(layerName) {
            if (layerName === 'streets') {
              map.removeLayer(googleSatellite);
              map.addLayer(googleStreets);
              document.getElementById('btn-streets').classList.add('active');
              document.getElementById('btn-satellite').classList.remove('active');
              currentLayer = 'streets';
            } else {
              map.removeLayer(googleStreets);
              map.addLayer(googleSatellite);
              document.getElementById('btn-satellite').classList.add('active');
              document.getElementById('btn-streets').classList.remove('active');
              currentLayer = 'satellite';
            }
          };

          let pickupMarker = null;
          let dropoffMarker = null;
          let driverMarker = null;
          let nearbyMarkers = [];
          let routeLine = null;

          map.on('click', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'press',
              coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng }
            }));
          });

          window.updateMapData = function(data) {
            // Pickup
            if (data.pickup) {
              const icon = L.divIcon({
                className: 'custom-pin',
                html: '🟢',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              });
              if (!pickupMarker) {
                pickupMarker = L.marker([data.pickup.latitude, data.pickup.longitude], { icon: icon }).addTo(map);
              } else {
                pickupMarker.setLatLng([data.pickup.latitude, data.pickup.longitude]);
              }
            } else if (pickupMarker) {
              map.removeLayer(pickupMarker);
              pickupMarker = null;
            }

            // Dropoff
            if (data.dropoff) {
              const icon = L.divIcon({
                className: 'custom-pin',
                html: '🔴',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              });
              if (!dropoffMarker) {
                dropoffMarker = L.marker([data.dropoff.latitude, data.dropoff.longitude], { icon: icon }).addTo(map);
              } else {
                dropoffMarker.setLatLng([data.dropoff.latitude, data.dropoff.longitude]);
              }
            } else if (dropoffMarker) {
              map.removeLayer(dropoffMarker);
              dropoffMarker = null;
            }

            // Assigned Driver
            if (data.driver) {
              const icon = L.divIcon({
                className: 'custom-driver',
                html: '🛺',
                iconSize: [34, 34],
                iconAnchor: [17, 17]
              });
              if (!driverMarker) {
                driverMarker = L.marker([data.driver.latitude, data.driver.longitude], { icon: icon }).addTo(map);
              } else {
                driverMarker.setLatLng([data.driver.latitude, data.driver.longitude]);
              }
            } else if (driverMarker) {
              map.removeLayer(driverMarker);
              driverMarker = null;
            }

            // Nearby Drivers
            nearbyMarkers.forEach(m => map.removeLayer(m));
            nearbyMarkers = [];
            if (data.nearby && data.nearby.length > 0) {
              data.nearby.forEach(d => {
                if (d.lat && d.lng) {
                  const icon = L.divIcon({
                    className: 'custom-driver',
                    html: '🛺',
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                  });
                  const m = L.marker([d.lat, d.lng], { icon: icon })
                    .bindPopup('<b>' + d.name + '</b><br>' + d.vehicle)
                    .addTo(map);
                  nearbyMarkers.push(m);
                }
              });
            }

            // Real-world road routing via OSRM (Open Source Routing Machine)
            if (data.pickup && data.dropoff) {
              const start = data.pickup.longitude + ',' + data.pickup.latitude;
              const end = data.dropoff.longitude + ',' + data.dropoff.latitude;
              const osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + start + ';' + end + '?overview=full&geometries=geojson';

              fetch(osrmUrl)
                .then(r => r.json())
                .then(res => {
                  if (res.routes && res.routes.length > 0) {
                    const route = res.routes[0];
                    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
                    
                    if (!routeLine) {
                      routeLine = L.polyline(coords, {
                        color: '#0284C7',
                        weight: 5,
                        opacity: 0.9,
                        lineJoin: 'round'
                      }).addTo(map);
                    } else {
                      routeLine.setLatLngs(coords);
                    }

                    // Fit map view to complete route
                    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

                    // Show distance and estimated tricycle travel time (avg 25 km/h)
                    const distKm = (route.distance / 1000).toFixed(1);
                    const durationMins = Math.max(1, Math.round((route.distance / 1000 / 25) * 60));

                    document.getElementById('route-dist').innerText = distKm + ' km';
                    document.getElementById('route-time').innerText = '~' + durationMins + ' mins';
                    document.getElementById('route-card').style.display = 'flex';
                  }
                })
                .catch(() => {
                  // Fallback to straight dashed line if offline
                  const latlngs = [
                    [data.pickup.latitude, data.pickup.longitude],
                    [data.dropoff.latitude, data.dropoff.longitude]
                  ];
                  if (!routeLine) {
                    routeLine = L.polyline(latlngs, {
                      color: '#0D9488',
                      weight: 4,
                      dashArray: '6, 8'
                    }).addTo(map);
                  } else {
                    routeLine.setLatLngs(latlngs);
                  }
                });
            } else if (routeLine) {
              map.removeLayer(routeLine);
              routeLine = null;
              document.getElementById('route-card').style.display = 'none';
            }
          };
        </script>
      </body>
      </html>
    `;

    const LeafletWebView = WebView as any;

    return (
      <View style={[styles.container, style]}>
        <LeafletWebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: leafletHtml }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={(event: any) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'press' && onPress) {
                onPress({ nativeEvent: { coordinate: data.coordinate } });
              }
            } catch {}
          }}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
  },
});
