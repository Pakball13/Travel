"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { Coordinates } from "@/lib/travel-data";

function FitRouteBounds({ points }: { points: Coordinates[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points as LatLngBoundsExpression, { padding: [38, 38], maxZoom: 11 });
    } else if (points[0]) {
      map.setView(points[0] as LatLngExpression, 8);
    }
  }, [map, points]);

  return null;
}

export default function PakistanMap({
  originName,
  destinationName,
  originCoordinates,
  destinationCoordinates,
  routePath,
}: {
  originName: string;
  destinationName: string;
  originCoordinates: Coordinates;
  destinationCoordinates: Coordinates;
  routePath: Coordinates[];
}) {
  const points = routePath.length > 1 ? routePath : [originCoordinates, destinationCoordinates];
  const center = destinationCoordinates;

  return (
    <MapContainer
      center={center}
      zoom={6}
      minZoom={4}
      maxZoom={15}
      scrollWheelZoom={false}
      className="route-leaflet-map"
      aria-label={`Map route from ${originName} to ${destinationName}`}
    >
      <TileLayer
        attribution={'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitRouteBounds points={points} />
      {points.length > 1 ? (
        <Polyline
          positions={points as LatLngExpression[]}
          pathOptions={{ color: "#b96243", weight: 4, opacity: 0.82, lineCap: "round", lineJoin: "round" }}
        />
      ) : null}
      <CircleMarker
        center={originCoordinates}
        radius={8}
        pathOptions={{ color: "#fbf8f0", weight: 3, fillColor: "#335d4b", fillOpacity: 1 }}
      >
        <Popup>{originName} · start</Popup>
      </CircleMarker>
      <CircleMarker
        center={destinationCoordinates}
        radius={8}
        pathOptions={{ color: "#fbf8f0", weight: 3, fillColor: "#c76647", fillOpacity: 1 }}
      >
        <Popup>{destinationName} · your somewhere</Popup>
      </CircleMarker>
    </MapContainer>
  );
}
