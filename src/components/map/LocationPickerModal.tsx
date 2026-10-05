import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { colors, borderRadius, typography, spacing } from '../../theme';
import { LocationItem } from '../../types';
import { getAllLocations } from '../../api/admin';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { getCurrentCoordinates, reverseGeocode } from '../../utils/location';

interface LocationPickerModalProps {
  visible: boolean;
  title: string;
  onSelect: (location: LocationItem) => void;
  onClose: () => void;
}

import { getSavedPlaces, SavedPlace } from '../../utils/savedLocations';
import {
  PHILIPPINE_REGIONS,
  PhilippineRegion,
  DEFAULT_REGION,
  isPointInsideRegion,
} from '../../utils/regions';

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  title,
  onSelect,
  onClose,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<PhilippineRegion>(DEFAULT_REGION);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<LocationItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);

  useEffect(() => {
    if (visible) {
      getSavedPlaces().then(setSavedPlaces);
    }
  }, [visible]);

  // Region-by-region search across the Philippines
  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const term = search.trim();
        
        const isInsidePhilippines = (lat: number, lon: number) => {
          return lat >= 4.5 && lat <= 21.5 && lon >= 116.0 && lon <= 127.0;
        };

        // 1. Nominatim search strictly bounded to the selected region's viewbox
        const nominatimPromise = fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&addressdetails=1&limit=25&countrycodes=ph&viewbox=${selectedRegion.viewbox}&bounded=${selectedRegion.id === 'all-ph' ? '0' : '1'}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept-Language': 'en-US,en;q=0.9,fil;q=0.8',
            },
          }
        ).then((r) => r.json()).catch(() => []);

        // 2. Photon Geocoder (OSM POI search centered on selected region)
        const photonPromise = fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(term)}&lat=${selectedRegion.centerLat}&lon=${selectedRegion.centerLng}&limit=20`
        ).then((r) => r.json()).catch(() => ({ features: [] }));

        const [nominatimData, photonData] = await Promise.all([nominatimPromise, photonPromise]);

        const combinedMap = new Map<string, LocationItem>();

        // Common Philippine Government Agency & Security Agency keywords
        const GOV_AGENCY_KEYWORDS = [
          'hall', 'barangay', 'brgy', 'municipal', 'city hall', 'provincial', 'capitol',
          'sss', 'social security', 'philhealth', 'pag-ibig', 'hdmf', 'bir', 'revenue',
          'lto', 'land transportation', 'ltfrb', 'dfa', 'foreign affairs', 'psa', 'statistics',
          'dswd', 'dole', 'labor', 'doh', 'health', 'deped', 'education', 'tesda',
          'pnp', 'police', 'bfp', 'fire', 'bjmp', 'jail', 'nbi', 'investigation',
          'comelec', 'elections', 'post office', 'phlpost', 'customs', 'boc',
          'dpwh', 'public works', 'da', 'agriculture', 'dar', 'agrarian',
          'denr', 'environment', 'dilg', 'local government', 'dti', 'trade and industry',
          'dot', 'tourism', 'dict', 'cooperative', 'cda', 'registry of deeds', 'court', 'hall of justice'
        ];

        const SECURITY_AGENCY_KEYWORDS = [
          'security agency', 'security services', 'protective agency', 'investigation agency',
          'security guard', 'detective agency', 'surveillance', 'armored', 'watchman agency',
          'security force', 'protective service', 'security provider', 'padpaao', 'security group'
        ];

        const isGovernmentAgency = (nameStr: string, typeStr: string) => {
          const lower = `${nameStr} ${typeStr}`.toLowerCase();
          return GOV_AGENCY_KEYWORDS.some((kw) => {
            const regex = new RegExp(`\\b${kw}\\b`, 'i');
            return regex.test(lower);
          });
        };

        const isSecurityAgency = (nameStr: string, typeStr: string) => {
          const lower = `${nameStr} ${typeStr}`.toLowerCase();
          return SECURITY_AGENCY_KEYWORDS.some((kw) => lower.includes(kw)) ||
            (lower.includes('security') && (lower.includes('agency') || lower.includes('services') || lower.includes('corp') || lower.includes('inc')));
        };

        // Process Nominatim results (Agencies, Security Agencies, Schools, Buildings, Places)
        if (Array.isArray(nominatimData)) {
          nominatimData.forEach((item: any) => {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            if (!isInsidePhilippines(lat, lon)) return; // Strictly ignore anything outside the Philippines

            const placeType = item.type || item.class || '';
            const rawName = item.namedetails?.name || item.display_name.split(',')[0];

            let iconType = '📍';
            if (isSecurityAgency(rawName, placeType)) {
              iconType = '🛡️';
            } else if (isGovernmentAgency(rawName, placeType) || placeType.includes('townhall') || placeType.includes('courthouse') || placeType.includes('police') || placeType.includes('post_office')) {
              iconType = '🏛️';
            } else if (placeType.includes('school') || placeType.includes('college') || placeType.includes('university') || placeType.includes('kindergarten')) {
              iconType = '🏫';
            } else if (placeType.includes('hospital') || placeType.includes('clinic') || placeType.includes('pharmacy')) {
              iconType = '🏥';
            } else if (placeType.includes('building') || placeType.includes('commercial') || placeType.includes('residential') || placeType.includes('hall')) {
              iconType = '🏢';
            } else if (placeType.includes('church') || placeType.includes('place_of_worship') || placeType.includes('mosque')) {
              iconType = '⛪';
            } else if (placeType.includes('station') || placeType.includes('terminal') || placeType.includes('bus')) {
              iconType = '🚏';
            }

            const name = rawName;
            const key = `${name.toLowerCase()}-${lat.toFixed(4)}`;
            if (!combinedMap.has(key)) {
              combinedMap.set(key, {
                location_id: `nom-${item.place_id}`,
                name: `${iconType} ${name}`,
                address: item.display_name,
                latitude: lat,
                longitude: lon,
                is_popular: iconType === '🏛️' || iconType === '🛡️',
                created_at: new Date().toISOString(),
              });
            }
          });
        }

        // Process Photon POI results (Agencies, Security Agencies, Buildings, Landmarks)
        if (photonData?.features && Array.isArray(photonData.features)) {
          photonData.features.forEach((feat: any) => {
            const props = feat.properties;
            const coords = feat.geometry?.coordinates;
            if (coords && coords.length >= 2) {
              const [lon, lat] = coords;
              if (!isInsidePhilippines(lat, lon)) return; // Strictly ignore anything outside the Philippines
              if (props.country && props.country.toLowerCase() !== 'philippines' && props.countrycode !== 'PH') return;

              const name = props.name || props.street || props.district || 'Location';
              const osmValue = props.osm_value || '';
              const osmKey = props.osm_key || '';
              
              let iconType = '📍';
              if (isSecurityAgency(name, `${osmValue} ${osmKey}`)) {
                iconType = '🛡️';
              } else if (isGovernmentAgency(name, `${osmValue} ${osmKey}`) || osmValue.includes('townhall') || osmValue.includes('courthouse') || osmValue.includes('police') || osmValue.includes('post_office') || osmValue.includes('government')) {
                iconType = '🏛️';
              } else if (osmValue.includes('school') || osmValue.includes('college') || osmValue.includes('university') || osmKey === 'amenity') {
                iconType = '🏫';
              } else if (osmValue.includes('hospital') || osmValue.includes('clinic')) {
                iconType = '🏥';
              } else if (osmValue.includes('building') || osmValue.includes('hall')) {
                iconType = '🏢';
              } else if (osmValue.includes('place_of_worship') || osmValue.includes('church')) {
                iconType = '⛪';
              } else if (osmValue.includes('terminal') || osmValue.includes('station')) {
                iconType = '🚏';
              }

              const addressParts = [props.name, props.street, props.district, props.city, props.state, 'Philippines']
                .filter(Boolean)
                .join(', ');

              const key = `${name.toLowerCase()}-${lat.toFixed(4)}`;
              if (!combinedMap.has(key)) {
                combinedMap.set(key, {
                  location_id: `phot-${props.osm_id || Math.random()}`,
                  name: `${iconType} ${name}`,
                  address: addressParts || `${name}, Philippines`,
                  latitude: lat,
                  longitude: lon,
                  is_popular: iconType === '🏛️' || iconType === '🛡️',
                  created_at: new Date().toISOString(),
                });
              }
            }
          });
        }

        const allResults = Array.from(combinedMap.values());
        // Prioritize and sort locations inside the selected region first
        allResults.sort((a, b) => {
          const aInRegion = isPointInsideRegion(Number(a.latitude), Number(a.longitude), selectedRegion) ? 1 : 0;
          const bInRegion = isPointInsideRegion(Number(b.latitude), Number(b.longitude), selectedRegion) ? 1 : 0;
          return bInRegion - aInRegion;
        });

        setResults(allResults);
      } catch {
        // ignore network errors
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedRegion]);

  const handleUseCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      const coords = await getCurrentCoordinates();

      if (coords) {
        const { name, fullAddress } = await reverseGeocode(coords.latitude, coords.longitude);
        const currentLocItem: LocationItem = {
          location_id: `gps-${Date.now()}`,
          name: `📍 ${name}`,
          address: fullAddress,
          latitude: coords.latitude,
          longitude: coords.longitude,
          is_popular: false,
          created_at: new Date().toISOString(),
        };

        setGettingLocation(false);
        onSelect(currentLocItem);
        onClose();
      } else {
        // Fallback default coordinates if permission was denied or GPS unavailable
        const fallbackItem: LocationItem = {
          location_id: `gps-fallback-${Date.now()}`,
          name: '📍 Current Location',
          address: 'Makilala, North Cotabato',
          latitude: 6.96045,
          longitude: 125.08862,
          is_popular: false,
          created_at: new Date().toISOString(),
        };
        setGettingLocation(false);
        onSelect(fallbackItem);
        onClose();
      }
    } catch {
      setGettingLocation(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Quick GPS Location Button */}
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleUseCurrentLocation}
            disabled={gettingLocation}
          >
            <View style={styles.gpsIconCircle}>
              <Text style={styles.gpsIcon}>🎯</Text>
            </View>
            <View style={styles.gpsDetails}>
              <Text style={styles.gpsTitle}>Use Current Location</Text>
              <Text style={styles.gpsSubtitle}>
                {gettingLocation ? 'Acquiring GPS fix...' : 'Pin pickup to your exact current position'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Saved Places Quick Select */}
          {savedPlaces.length > 0 && (
            <View style={styles.savedPlacesContainer}>
              <Text style={styles.savedPlacesTitle}>SAVED PLACES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedPlacesScroll}>
                {savedPlaces.map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    style={styles.savedPlaceChip}
                    onPress={() => {
                      onSelect({
                        location_id: place.id,
                        name: `${place.icon} ${place.label}`,
                        address: place.address,
                        latitude: place.latitude,
                        longitude: place.longitude,
                        is_popular: true,
                        created_at: new Date().toISOString(),
                      });
                      onClose();
                    }}
                  >
                    <Text style={styles.savedPlaceChipIcon}>{place.icon}</Text>
                    <View>
                      <Text style={styles.savedPlaceChipLabel}>{place.label}</Text>
                      <Text style={styles.savedPlaceChipAddress} numberOfLines={1}>
                        {place.address}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Region-by-Region Selection Bar */}
          <View style={styles.regionBarContainer}>
            <View style={styles.regionBarHeader}>
              <Text style={styles.regionBarTitle}>OPERATING REGION</Text>
              <Text style={styles.regionActiveBadge}>{selectedRegion.code}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.regionScroll}
            >
              {PHILIPPINE_REGIONS.map((reg) => {
                const isSelected = selectedRegion.id === reg.id;
                return (
                  <TouchableOpacity
                    key={reg.id}
                    style={[styles.regionChip, isSelected && styles.regionChipActive]}
                    onPress={() => setSelectedRegion(reg)}
                  >
                    <Text
                      style={[styles.regionChipText, isSelected && styles.regionChipTextActive]}
                    >
                      {reg.shortName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Quick Hub Shortcuts for Selected Region */}
            {selectedRegion.keyHubs && selectedRegion.keyHubs.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hubScroll}
              >
                {selectedRegion.keyHubs.map((hub) => (
                  <TouchableOpacity
                    key={hub}
                    style={styles.hubChip}
                    onPress={() => setSearch(hub)}
                  >
                    <Text style={styles.hubChipText}>📍 {hub}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <Input
            placeholder={`Search ${selectedRegion.shortName} (landmarks, terminals, crossings)...`}
            value={search}
            onChangeText={setSearch}
            leftIcon={<Text style={styles.searchIcon}>🔍</Text>}
            helperText={searching ? `Searching live locations in ${selectedRegion.name}...` : undefined}
          />

          <Text style={styles.sectionHeader}>
            {search.trim().length >= 2 ? `Search Results in ${selectedRegion.shortName}` : `Type to search within ${selectedRegion.shortName}`}
          </Text>

          <FlatList
            data={results}
            keyExtractor={(item) => item.location_id}
            renderItem={({ item }) => {
              // Extract icon emoji if present in item.name
              const firstChar = item.name ? Array.from(item.name)[0] : '📍';
              const hasEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(firstChar);
              const displayIcon = hasEmoji ? firstChar : '📍';
              const cleanName = hasEmoji ? item.name?.replace(firstChar, '').trim() : item.name;

              return (
                <TouchableOpacity
                  style={styles.locationItem}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <View style={styles.iconCircle}>
                    <Text style={styles.locIcon}>{displayIcon}</Text>
                  </View>
                  <View style={styles.locDetails}>
                    <Text style={styles.locName}>{cleanName}</Text>
                    <Text style={styles.locAddress} numberOfLines={2}>
                      {item.address}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {search.trim().length < 2
                    ? 'Start typing any city, street, school, or landmark in the Philippines...'
                    : searching
                    ? 'Searching...'
                    : 'No matching locations found.'}
                </Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeText: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  savedPlacesContainer: {
    marginBottom: spacing.sm,
  },
  savedPlacesTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  savedPlacesScroll: {
    gap: spacing.sm,
    paddingBottom: 4,
  },
  savedPlaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: 220,
  },
  savedPlaceChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  savedPlaceChipLabel: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  savedPlaceChipAddress: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    maxWidth: 160,
  },
  regionBarContainer: {
    marginBottom: spacing.sm,
    backgroundColor: '#F8FAFC',
    padding: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  regionBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  regionBarTitle: {
    ...typography.captionBold,
    color: '#64748B',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  regionActiveBadge: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 9,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  regionScroll: {
    gap: 6,
    paddingBottom: 4,
  },
  regionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  regionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  regionChipText: {
    ...typography.captionBold,
    color: '#475569',
    fontSize: 11,
  },
  regionChipTextActive: {
    color: '#FFFFFF',
  },
  hubScroll: {
    gap: 4,
    paddingTop: 4,
  },
  hubChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: borderRadius.sm,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  hubChipText: {
    ...typography.caption,
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '600',
  },
  searchIcon: {
    fontSize: 16,
  },
  sectionHeader: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: spacing.sm,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  locIcon: {
    fontSize: 16,
  },
  locDetails: {
    flex: 1,
  },
  locName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  locAddress: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  gpsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  gpsIcon: {
    fontSize: 20,
  },
  gpsDetails: {
    flex: 1,
  },
  gpsTitle: {
    ...typography.bodyBold,
    color: '#166534',
    fontSize: 15,
  },
  gpsSubtitle: {
    ...typography.caption,
    color: '#15803D',
    marginTop: 2,
  },
});
