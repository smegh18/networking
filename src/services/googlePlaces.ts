import Constants from 'expo-constants';
import { firebaseConfig } from '../../firebase.config';

export type AddressPrediction = {
  description: string;
  placeId: string;
};

export type ParsedAddress = {
  formattedAddress: string;
  area: string;
  city: string;
  state: string;
  pinCode: string;
  placeId: string;
  latitude?: number;
  longitude?: number;
};

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function getPlacesApiKey(): string {
  const configuredKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
  return String(configuredKey || firebaseConfig.apiKey || '').trim();
}

function getComponent(components: AddressComponent[], type: string, useShortName = false): string {
  const match = components.find((component) => component.types.includes(type));
  if (!match) return '';
  return useShortName ? match.short_name : match.long_name;
}

export function isGooglePlacesConfigured(): boolean {
  return !!getPlacesApiKey();
}

export async function fetchAddressPredictions(input: string): Promise<AddressPrediction[]> {
  const query = input.trim();
  const apiKey = getPlacesApiKey();
  if (!apiKey || query.length < 3) return [];

  const params = new URLSearchParams({
    input: query,
    key: apiKey,
    components: 'country:in',
    types: 'geocode',
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`);
  const payload = await response.json();
  if (payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS') {
    throw new Error(payload.error_message || payload.status || 'Unable to fetch address suggestions.');
  }
  return (payload.predictions || []).map((prediction: { description: string; place_id: string }) => ({
    description: prediction.description,
    placeId: prediction.place_id,
  }));
}

export async function fetchAddressDetails(placeId: string): Promise<ParsedAddress> {
  const apiKey = getPlacesApiKey();
  if (!apiKey || !placeId) {
    throw new Error('Google Places API key is not configured.');
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    fields: 'address_component,formatted_address,geometry,place_id',
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`);
  const payload = await response.json();
  if (payload.status !== 'OK') {
    throw new Error(payload.error_message || payload.status || 'Unable to fetch address details.');
  }

  const result = payload.result || {};
  const components = (result.address_components || []) as AddressComponent[];
  const city =
    getComponent(components, 'locality')
    || getComponent(components, 'postal_town')
    || getComponent(components, 'administrative_area_level_3')
    || getComponent(components, 'administrative_area_level_2');
  const area =
    getComponent(components, 'sublocality_level_1')
    || getComponent(components, 'sublocality')
    || getComponent(components, 'neighborhood')
    || getComponent(components, 'route');
  const state = getComponent(components, 'administrative_area_level_1');
  const pinCode = getComponent(components, 'postal_code');
  const location = result.geometry?.location;

  return {
    formattedAddress: String(result.formatted_address || ''),
    area,
    city,
    state,
    pinCode,
    placeId: String(result.place_id || placeId),
    latitude: typeof location?.lat === 'number' ? location.lat : undefined,
    longitude: typeof location?.lng === 'number' ? location.lng : undefined,
  };
}
