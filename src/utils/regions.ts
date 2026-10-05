export interface PhilippineRegion {
  id: string;
  code: string;
  name: string;
  shortName: string;
  island: 'Mindanao' | 'Visayas' | 'Luzon';
  centerLat: number;
  centerLng: number;
  viewbox: string; // minLon,maxLat,maxLon,minLat for Nominatim
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  keyHubs: string[];
}

export const PHILIPPINE_REGIONS: PhilippineRegion[] = [
  {
    id: 'region-12',
    code: 'R12',
    name: 'Region XII — SOCCSKSARGEN',
    shortName: 'Region XII (Cotabato)',
    island: 'Mindanao',
    centerLat: 6.9604,
    centerLng: 125.0886,
    viewbox: '124.0,7.8,125.6,5.5',
    bounds: { minLat: 5.5, maxLat: 7.8, minLon: 124.0, maxLon: 125.6 },
    keyHubs: ['Makilala', 'Kidapawan', 'General Santos', 'Koronadal', 'Tacurong', 'Midsayap', 'Malungon', 'Polomolok'],
  },
  {
    id: 'region-11',
    code: 'R11',
    name: 'Region XI — Davao Region',
    shortName: 'Region XI (Davao)',
    island: 'Mindanao',
    centerLat: 7.0731,
    centerLng: 125.6128,
    viewbox: '125.0,8.2,126.6,5.8',
    bounds: { minLat: 5.8, maxLat: 8.2, minLon: 125.0, maxLon: 126.6 },
    keyHubs: ['Davao City', 'Digos', 'Tagum', 'Panabo', 'Mati', 'Santa Cruz', 'Bansalan', 'Samal'],
  },
  {
    id: 'region-10',
    code: 'R10',
    name: 'Region X — Northern Mindanao',
    shortName: 'Region X (NorMin)',
    island: 'Mindanao',
    centerLat: 8.4822,
    centerLng: 124.6472,
    viewbox: '123.5,9.2,125.5,7.5',
    bounds: { minLat: 7.5, maxLat: 9.2, minLon: 123.5, maxLon: 125.5 },
    keyHubs: ['Cagayan de Oro', 'Iligan', 'Malaybalay', 'Valencia', 'Gingoog', 'Ozamiz', 'Oroquieta'],
  },
  {
    id: 'region-9',
    code: 'R9',
    name: 'Region IX — Zamboanga Peninsula',
    shortName: 'Region IX (Zamboanga)',
    island: 'Mindanao',
    centerLat: 6.9214,
    centerLng: 122.0790,
    viewbox: '121.5,8.8,123.5,6.5',
    bounds: { minLat: 6.5, maxLat: 8.8, minLon: 121.5, maxLon: 123.5 },
    keyHubs: ['Zamboanga City', 'Pagadian', 'Dipolog', 'Dapitan', 'Ipil'],
  },
  {
    id: 'region-13',
    code: 'R13',
    name: 'Region XIII — Caraga Region',
    shortName: 'Region XIII (Caraga)',
    island: 'Mindanao',
    centerLat: 8.9475,
    centerLng: 125.5406,
    viewbox: '125.0,10.2,126.6,7.8',
    bounds: { minLat: 7.8, maxLat: 10.2, minLon: 125.0, maxLon: 126.6 },
    keyHubs: ['Butuan', 'Surigao City', 'Bayugan', 'Tandag', 'Bislig', 'Cabadbaran'],
  },
  {
    id: 'barmm',
    code: 'BARMM',
    name: 'BARMM — Bangsamoro',
    shortName: 'BARMM',
    island: 'Mindanao',
    centerLat: 7.2236,
    centerLng: 124.2464,
    viewbox: '119.5,8.0,124.8,4.8',
    bounds: { minLat: 4.8, maxLat: 8.0, minLon: 119.5, maxLon: 124.8 },
    keyHubs: ['Cotabato City', 'Marawi', 'Lamitan', 'Jolo', 'Bongao'],
  },
  {
    id: 'region-7',
    code: 'R7',
    name: 'Region VII — Central Visayas',
    shortName: 'Region VII (Cebu/Bohol)',
    island: 'Visayas',
    centerLat: 10.3157,
    centerLng: 123.8854,
    viewbox: '122.8,11.5,124.6,9.2',
    bounds: { minLat: 9.2, maxLat: 11.5, minLon: 122.8, maxLon: 124.6 },
    keyHubs: ['Cebu City', 'Mandaue', 'Lapu-Lapu', 'Tagbilaran', 'Dumaguete', 'Talisay', 'Toledo'],
  },
  {
    id: 'region-6',
    code: 'R6',
    name: 'Region VI — Western Visayas',
    shortName: 'Region VI (Iloilo/Bacolod)',
    island: 'Visayas',
    centerLat: 10.7202,
    centerLng: 122.5621,
    viewbox: '121.8,12.0,123.6,9.8',
    bounds: { minLat: 9.8, maxLat: 12.0, minLon: 121.8, maxLon: 123.6 },
    keyHubs: ['Iloilo City', 'Bacolod', 'Roxas City', 'Passi', 'Kalibo', 'San Jose de Buenavista'],
  },
  {
    id: 'ncr',
    code: 'NCR',
    name: 'NCR — National Capital Region',
    shortName: 'Metro Manila (NCR)',
    island: 'Luzon',
    centerLat: 14.5995,
    centerLng: 120.9842,
    viewbox: '120.8,14.8,121.2,14.3',
    bounds: { minLat: 14.3, maxLat: 14.8, minLon: 120.8, maxLon: 121.2 },
    keyHubs: ['Manila', 'Quezon City', 'Makati', 'Taguig', 'Pasig', 'Caloocan', 'Pasay', 'Parañaque'],
  },
  {
    id: 'region-4a',
    code: 'R4A',
    name: 'Region IV-A — CALABARZON',
    shortName: 'Region IV-A (CALABARZON)',
    island: 'Luzon',
    centerLat: 14.1670,
    centerLng: 121.2420,
    viewbox: '120.5,15.2,122.6,13.4',
    bounds: { minLat: 13.4, maxLat: 15.2, minLon: 120.5, maxLon: 122.6 },
    keyHubs: ['Antipolo', 'Calamba', 'Batangas City', 'Lucena', 'Lipa', 'Santa Rosa', 'Imus', 'Bacoor'],
  },
  {
    id: 'all-ph',
    code: 'ALL',
    name: '🇵🇭 All Regions (Nationwide)',
    shortName: 'All Regions',
    island: 'Mindanao',
    centerLat: 12.8797,
    centerLng: 121.7740,
    viewbox: '116.0,21.5,127.0,4.5',
    bounds: { minLat: 4.5, maxLat: 21.5, minLon: 116.0, maxLon: 127.0 },
    keyHubs: ['Makilala', 'Davao', 'Cebu', 'Manila', 'Cagayan de Oro'],
  },
];

export const DEFAULT_REGION = PHILIPPINE_REGIONS[0]; // Region XII (SOCCSKSARGEN)

export function getRegionById(id?: string): PhilippineRegion {
  if (!id) return DEFAULT_REGION;
  return PHILIPPINE_REGIONS.find((r) => r.id === id || r.code === id) || DEFAULT_REGION;
}

export function isPointInsideRegion(lat: number, lon: number, region: PhilippineRegion): boolean {
  if (region.id === 'all-ph') return true;
  return (
    lat >= region.bounds.minLat &&
    lat <= region.bounds.maxLat &&
    lon >= region.bounds.minLon &&
    lon <= region.bounds.maxLon
  );
}
